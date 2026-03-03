import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DoodleCanvas } from '@/components/doodle/DoodleCanvas';
import { useListeningSession } from '@/hooks/useListeningSession';
import { COLORS } from '@/lib/constants';
import type { DoodleStroke } from '@/types';

export default function DoodleScreen() {
  const { sessionId, affirmationTitle } = useLocalSearchParams<{
    sessionId: string;
    affirmationTitle: string;
  }>();
  const { saveDoodle, completeSession } = useListeningSession();
  const [hasStrokes, setHasStrokes] = useState(false);
  const [saving, setSaving] = useState(false);

  const { canvasView, undo, getCanvasData } = DoodleCanvas({
    onStrokesChange: (_strokes: DoodleStroke[], has: boolean) => {
      setHasStrokes(has);
    },
  });

  const handleSave = async () => {
    if (!sessionId || saving) return;
    setSaving(true);
    try {
      const canvasData = getCanvasData();
      const doodleJson = JSON.stringify(canvasData);
      await saveDoodle(sessionId, doodleJson);
      await completeSession(sessionId).catch(() => {});
      router.dismissAll();
      router.replace('/(main)/(tabs)');
    } catch {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Doodle time!"
        subtitle="Scribble below with whatever you're feeling."
      />

      {/* Canvas */}
      <View style={styles.canvasWrapper}>
        {canvasView}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.undoButton, !hasStrokes && styles.undoDisabled]}
          onPress={undo}
          disabled={!hasStrokes}
        >
          <Ionicons
            name="arrow-undo"
            size={22}
            color={hasStrokes ? COLORS.text : COLORS.textMuted}
          />
        </Pressable>

        <Pressable
          style={[
            styles.saveButton,
            !hasStrokes && styles.saveDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasStrokes || saving}
        >
          <Text
            style={[
              styles.saveLabel,
              !hasStrokes && styles.saveLabelDisabled,
            ]}
          >
            {saving ? 'Saving...' : 'Save Doodle'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  canvasWrapper: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  undoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoDisabled: {
    opacity: 0.4,
  },
  saveButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.3,
  },
  saveLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  saveLabelDisabled: {
    color: COLORS.white,
  },
});
