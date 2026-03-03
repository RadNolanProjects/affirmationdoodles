import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { COLORS } from '@/lib/constants';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'white';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isFilled = variant === 'filled';
  const isWhite = variant === 'white';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isFilled ? styles.filled : isWhite ? styles.white : styles.outlined,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? COLORS.white : COLORS.text} />
      ) : (
        <Text
          style={[
            styles.label,
            isFilled ? styles.labelFilled : styles.labelOutlined,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 63,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  filled: {
    backgroundColor: COLORS.accent,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  white: {
    backgroundColor: COLORS.white,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelFilled: {
    color: COLORS.white,
  },
  labelOutlined: {
    color: COLORS.text,
  },
});
