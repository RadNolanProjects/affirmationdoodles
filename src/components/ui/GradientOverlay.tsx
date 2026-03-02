import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/lib/constants';

type GradientOverlayProps = {
  position: 'top' | 'bottom';
  height?: number;
};

export function GradientOverlay({
  position,
  height = 120,
}: GradientOverlayProps) {
  const colors =
    position === 'top'
      ? ([COLORS.background, 'transparent'] as const)
      : (['transparent', COLORS.background] as const);

  return (
    <LinearGradient
      colors={colors}
      style={[
        styles.gradient,
        { height },
        position === 'top' ? styles.top : styles.bottom,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
