import { Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';

export default function ListenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
