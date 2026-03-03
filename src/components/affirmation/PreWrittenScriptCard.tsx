import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';

type Props = {
  script: { title: string; script: string };
  onPress: () => void;
};

export function PreWrittenScriptCard({ script, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>{script.title}</Text>
        <Text style={styles.scriptText} numberOfLines={8}>
          {script.script.replace(/\n/g, ' ')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 312,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 24,
  },
  content: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  scriptText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
});
