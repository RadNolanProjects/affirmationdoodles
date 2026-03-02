import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { COLORS, FONTS } from '@/lib/constants';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const { width } = useWindowDimensions();
  const fontSize = width * 0.24;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            fontSize,
            lineHeight: fontSize * 0.8,
            letterSpacing: width * -0.005,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 25,
    paddingTop: 56,
  },
  title: {
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
