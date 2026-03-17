import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { type Session, type User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { STORAGE } from '@/lib/constants';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // On web, redirect back to the origin root — AuthProvider handles the token exchange
    return window.location.origin;
  }
  // On native, use the deep link scheme
  return Linking.createURL('(auth)/verify');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On web, check if the current URL contains auth tokens (from magic link redirect)
    if (Platform.OS === 'web') {
      // PKCE flow: Supabase v2 redirects with ?code= query parameter
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(() => {
          // Clean up the URL query string
          window.history.replaceState(null, '', window.location.pathname);
        });
      }

      // Implicit flow fallback: older Supabase or explicit config uses #access_token=
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(() => {
              window.history.replaceState(null, '', window.location.pathname);
            });
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = getRedirectUrl();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async () => {
    const user = session?.user;
    if (!user) throw new Error('Not authenticated');

    // Delete all audio files from storage
    const { data: files } = await supabase.storage
      .from(STORAGE.audioBucket)
      .list(user.id);
    if (files && files.length > 0) {
      await supabase.storage
        .from(STORAGE.audioBucket)
        .remove(files.map((f) => `${user.id}/${f.name}`));
    }

    // Delete all user data (cascade will handle related records)
    await supabase.from('affirmations').delete().eq('user_id', user.id);
    await supabase.from('listening_sessions').delete().eq('user_id', user.id);

    // Sign out (account deletion requires server-side admin API,
    // but clearing all data + signing out effectively removes the account)
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signInWithMagicLink,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
