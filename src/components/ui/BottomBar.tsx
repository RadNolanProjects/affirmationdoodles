import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';
import { Button } from './Button';

type BottomBarProps = {
  onBack?: () => void;
  ctaLabel?: string;
  ctaOnPress?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaVariant?: 'filled' | 'outlined' | 'white';
  showBack?: boolean;
};

export function BottomBar({
  onBack,
  ctaLabel,
  ctaOnPress,
  ctaDisabled = false,
  ctaLoading = false,
  ctaVariant,
  showBack = true,
}: BottomBarProps) {
  return (
    <View style={styles.container}>
      {showBack && onBack ? (
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      {ctaLabel && ctaOnPress && (
        <Button
          label={ctaLabel}
          onPress={ctaOnPress}
          disabled={ctaDisabled}
          loading={ctaLoading}
          variant={ctaVariant}
          style={styles.cta}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  backButton: {
    width: 63,
    height: 63,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.text,
  },
  spacer: {
    width: 0,
  },
  cta: {
    flex: 1,
  },
});
