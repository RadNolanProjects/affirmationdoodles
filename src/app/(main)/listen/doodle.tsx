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

const ASPECT_RATIO = 2 / 3; // width:height = 2:3
const CANVAS_PADDING = 20;

export default function DoodleScreen() {
  const { sessionId, affirmationTitle } = useLocalSearchParams<{
    sessionId: string;
    affirmationTitle: string;
  }>();
  const { saveDoodle } = useListeningSession();
  const [hasStrokes, setHasStrokes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Calculate canvas size from measured available space (shrink height a bit)
  const maxW = containerSize.width - CANVAS_PADDING * 2;
  const maxH = containerSize.height - CANVAS_PADDING * 3;
  const canvasWidth = Math.min(maxW, maxH * ASPECT_RATIO);
  const canvasHeight = canvasWidth / ASPECT_RATIO;

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
      router.dismissAll();
      router.replace({
        pathname: '/(main)/(tabs)',
        params: { justCompleted: '1', completedTitle: affirmationTitle ?? '' },
      });
    } catch {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScreenHeader
        title="Doodle!"
        subtitle="Scribble below with whatever you're feeling."
      />

      {/* Canvas */}
      <View
        style={styles.canvasOuter}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ width, height });
        }}
      >
        {containerSize.width > 0 && (
          <View style={{ width: canvasWidth, height: canvasHeight }}>
            {canvasView}
          </View>
        )}
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
  canvasOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
