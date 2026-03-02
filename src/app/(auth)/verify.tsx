import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useURL } from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONTS } from '@/lib/constants';

export default function VerifyScreen() {
  const url = useURL();
  const { session } = useAuth();

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
});
