import { useState } from 'react';
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

export default function SignInScreen() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error: authError } = await signInWithMagicLink(trimmed);
    setIsLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(auth)/verify');
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
            label="Send magic link"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!email.trim()}
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
