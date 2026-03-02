import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/lib/constants';

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator color={COLORS.text} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(main)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
