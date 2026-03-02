import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONTS } from '@/lib/constants';

const COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const url = useURL();
  const { session, signInWithMagicLink } = useAuth();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Start cooldown on mount (email was just sent from sign-in)
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return;
    setResendStatus(null);
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setResendStatus('Please wait a bit before requesting another link.');
    } else {
      setResendStatus('New magic link sent!');
    }
    startCooldown();
  }, [email, cooldown, signInWithMagicLink, startCooldown]);

  // On native, handle deep link tokens
  useEffect(() => {
    if (Platform.OS === 'web' || !url) return;

    const parsedUrl = new URL(url);
    const params = new URLSearchParams(
      parsedUrl.hash?.replace('#', '?') || parsedUrl.search
    );
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [url]);

  // Once session is established, redirect to dashboard
  if (session) {
    return <Redirect href="/(main)/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check your{'\n'}email.</Text>
        <Text style={styles.subtitle}>
          We sent you a magic link.{'\n'}Tap it to sign in.
        </Text>

        {email ? (
          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={styles.cooldownText}>
                Resend available in {cooldown}s
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={styles.resendLink}>Resend magic link</Text>
              </Pressable>
            )}
            {resendStatus && (
              <Text style={styles.resendStatus}>{resendStatus}</Text>
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 80,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: Dimensions.get('window').width * 0.24,
    lineHeight: Dimensions.get('window').width * 0.24 * 0.8,
    letterSpacing: Dimensions.get('window').width * -0.005,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: 24,
  },
  resendContainer: {
    marginTop: 40,
    gap: 8,
  },
  cooldownText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  resendLink: {
    fontSize: 14,
    color: COLORS.text,
    textDecorationLine: 'underline',
  },
  resendStatus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
