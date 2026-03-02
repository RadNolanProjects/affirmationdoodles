import { Stack } from 'expo-router';
import { COLORS } from '@/lib/constants';

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="customize" />
      <Stack.Screen name="custom" />
      <Stack.Screen name="record" />
    </Stack>
  );
}
