import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

export default function CompleteScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Done.</Text>
        <Text style={styles.subtitle}>
          You showed up for yourself today.{'\n'}That matters.
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          label="Back to Home"
          onPress={() => {
            router.dismissAll();
            router.replace('/(main)/(tabs)');
          }}
        />
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
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    fontSize: Dimensions.get('window').width * 0.24,
    lineHeight: Dimensions.get('window').width * 0.24 * 0.8,
    letterSpacing: Dimensions.get('window').width * -0.005,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});
