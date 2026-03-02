import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/constants';
import type { PreWrittenScript } from '@/types';

type Props = {
  script: PreWrittenScript;
  selected: boolean;
  onSelect: () => void;
};

export function PreWrittenScriptCard({ script, selected, onSelect }: Props) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {script.title}
        </Text>
        <Text
          style={[styles.scriptText, selected && styles.scriptTextSelected]}
          numberOfLines={8}
        >
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
  cardSelected: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  content: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  titleSelected: {
    color: COLORS.white,
  },
  scriptText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  scriptTextSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
});
