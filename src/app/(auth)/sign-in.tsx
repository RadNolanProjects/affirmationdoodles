import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, FONTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

const COOLDOWN_SECONDS = 60;

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('email rate limit');
}

export default function SignInScreen() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (cooldown > 0) return;

    setIsLoading(true);
    setError(null);

    const { error: authError } = await signInWithMagicLink(trimmed);
    setIsLoading(false);

    if (authError) {
      if (isRateLimitError(authError.message)) {
        setError('Please wait a minute before requesting another magic link.');
        startCooldown();
      } else {
        setError(authError.message);
      }
    } else {
      startCooldown();
      router.replace({ pathname: '/(auth)/verify', params: { email: trimmed } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Affirm.</Text>
          <Text style={styles.subtitle}>
            Record affirmations in your own voice.{'\n'}Listen daily. Show up
            for yourself.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Button
            label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Send magic link'}
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!email.trim() || cooldown > 0}
          />
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 40,
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
    marginTop: 16,
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  error: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 4,
  },
  footer: {
    paddingBottom: 16,
  },
});
