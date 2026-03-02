import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/lib/constants';

export default function MainLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="manage" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create" />
      <Stack.Screen name="listen" />
    </Stack>
  );
}
