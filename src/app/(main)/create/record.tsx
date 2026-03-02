import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientOverlay } from '@/components/ui/GradientOverlay';
import { Button } from '@/components/ui/Button';
import { useRecording } from '@/hooks/useRecording';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAffirmations } from '@/hooks/useAffirmations';
import { useAuth } from '@/contexts/AuthContext';
import { uploadAudio } from '@/lib/storage';
import { COLORS, FONTS } from '@/lib/constants';
import { splitIntoSentences } from '@/lib/text';
import { playBeep } from '@/lib/sounds';
import { RecordingPreview } from '@/components/affirmation/RecordingPreview';

type RecordingState = 'idle' | 'recording' | 'paused' | 'done';

export default function RecordScreen() {
  const { title, script, affirmationId } = useLocalSearchParams<{
    title: string;
    script: string;
    affirmationId?: string;
  }>();
  const { user } = useAuth();
  const { createAffirmation, updateAffirmation } = useAffirmations();
  const recording = useRecording();
  const speech = useSpeechRecognition();
  const scrollRef = useRef<ScrollView>(null);
  const lineHeightsRef = useRef<number[]>([]);
  const maxLineIndexRef = useRef(0);
  // Tracks spokenWordCount at the moment each line became active,
  // so word highlighting starts immediately on the new line
  const lineActivationCountRef = useRef(0);
  const lastActiveLineRef = useRef(-1);

  const { width: vw } = useWindowDimensions();
  const [state, setState] = useState<RecordingState>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRecording, setPendingRecording] = useState<{
    uri: string;
    durationSeconds: number;
  } | null>(null);
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

  const scriptLines = splitIntoSentences(script ?? '');
  const hasScript = scriptLines.length > 0;

  // Words per line for rendering
  const wordsPerLine = useMemo(() => {
    return scriptLines.map((line) => line.split(/\s+/).filter(Boolean));
  }, [script]);

  // Cumulative word counts to determine current line
  const cumulativeWordCounts = useMemo(() => {
    const counts: number[] = [];
    let total = 0;
    wordsPerLine.forEach((words) => {
      total += words.length;
      counts.push(total);
    });
    return counts;
  }, [wordsPerLine]);

  const totalWords = cumulativeWordCounts[cumulativeWordCounts.length - 1] || 0;

  // Determine which line is currently being spoken
  // Uses a 75% threshold so missed words don't block line advancement
  // Enforces monotonicity — once a line is passed, we never go back
  const currentLineIndex = useMemo(() => {
    let computed = 0;
    for (let i = 0; i < cumulativeWordCounts.length; i++) {
      const lineStart = i === 0 ? 0 : cumulativeWordCounts[i - 1];
      const lineWordCount = cumulativeWordCounts[i] - lineStart;
      const threshold = lineStart + Math.max(1, Math.ceil(lineWordCount * 0.75));
      if (speech.spokenWordCount < threshold) {
        computed = i;
        break;
      }
      computed = cumulativeWordCounts.length - 1;
    }
    maxLineIndexRef.current = Math.max(maxLineIndexRef.current, computed);
    return maxLineIndexRef.current;
  }, [speech.spokenWordCount, cumulativeWordCounts]);

  // When the active line changes, snapshot the current word count as the base
  // for highlighting on the new line — eliminates the gap from accumulated misses
  if (currentLineIndex !== lastActiveLineRef.current) {
    lineActivationCountRef.current = speech.spokenWordCount;
    lastActiveLineRef.current = currentLineIndex;
  }

  // Auto-scroll to keep the current line centered vertically.
  // Computes y by summing measured heights (reliable) instead of using onLayout y (can be stale).
  useEffect(() => {
    if (state !== 'idle' && scrollContainerHeight > 0) {
      const paddingTop = scrollContainerHeight / 2;
      const marginBottom = 30; // from styles.lineContainer.marginBottom
      let y = paddingTop;
      for (let i = 0; i < currentLineIndex; i++) {
        y += (lineHeightsRef.current[i] || 0) + marginBottom;
      }
      const lineHeight = lineHeightsRef.current[currentLineIndex] || 0;
      const centeredY = y - (scrollContainerHeight / 2) + (lineHeight / 2);
      scrollRef.current?.scrollTo({
        y: Math.max(0, centeredY),
        animated: true,
      });
    }
  }, [currentLineIndex, state, scrollContainerHeight]);


  const showError = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      const { Alert } = require('react-native');
      Alert.alert('Error', msg);
    }
  };

  const showConfirm = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise((resolve) => {
      const { Alert } = require('react-native');
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Yes', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleStartRecording = async () => {
    try {
      await recording.startRecording();
      playBeep();
      speech.start();
      setState('recording');
    } catch (err: any) {
      console.error('Start recording error:', err);
      showError(err.message || 'Failed to start recording');
    }
  };

  const handlePauseRecording = () => {
    recording.pauseRecording();
    speech.stop();
    setState('paused');
  };

  const handleResumeRecording = () => {
    recording.resumeRecording();
    speech.start();
    setState('recording');
  };

  const handleFinishRecording = async () => {
    speech.stop();
    const result = await recording.stopRecording();
    setPendingRecording({
      uri: result.uri!,
      durationSeconds: result.durationSeconds,
    });
    setState('done');
  };

  const handleSave = async () => {
    if (!pendingRecording) return;
    setIsSaving(true);

    try {
      await saveRecording(pendingRecording.uri, pendingRecording.durationSeconds);
    } catch (err: any) {
      console.error('Save error:', err);
      showError(err.message || 'Failed to save recording');
      setIsSaving(false);
    }
  };

  const handleRestart = async () => {
    const confirmed = await showConfirm(
      'Restart recording?',
      'This will discard your current recording. Are you sure?'
    );
    if (!confirmed) return;

    speech.reset();
    recording.resetRecording();
    setPendingRecording(null);
    maxLineIndexRef.current = 0;
    lineActivationCountRef.current = 0;
    lastActiveLineRef.current = -1;
    setState('idle');
  };

  const saveRecording = async (uri: string | null, durationSeconds: number) => {
    if (!user || !uri) {
      throw new Error('No recording to save');
    }

    if (affirmationId) {
      const audioPath = await uploadAudio(user.id, affirmationId, uri);
      await updateAffirmation(affirmationId, {
        audio_url: audioPath,
        audio_duration_seconds: durationSeconds,
      });
    } else {
      const affirmation = await createAffirmation({
        title: title ?? 'My Affirmation',
        script: script ?? '',
      });
      const audioPath = await uploadAudio(user.id, affirmation.id, uri);
      await updateAffirmation(affirmation.id, {
        audio_url: audioPath,
        audio_duration_seconds: durationSeconds,
      });
    }

    router.dismissAll();
    router.replace('/(main)/(tabs)');
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Record."
        subtitle="Words will scroll as you speak"
      />

      {/* Script Display */}
      <View
        style={styles.scriptContainer}
        onLayout={(e) => setScrollContainerHeight(e.nativeEvent.layout.height)}
      >
        <GradientOverlay position="top" height={80} />
        <ScrollView
          ref={scrollRef}
          style={styles.scriptScroll}
          contentContainerStyle={[
            styles.scriptContent,
            scrollContainerHeight > 0 && {
              paddingTop: scrollContainerHeight / 2,
              paddingBottom: scrollContainerHeight / 2,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {hasScript ? (
            (() => {
              let globalWordIndex = 0;
              return scriptLines.map((line, lineIndex) => {
                const words = wordsPerLine[lineIndex];
                const lineStartIndex = globalWordIndex;
                const isCurrent = state !== 'idle' && lineIndex === currentLineIndex;
                const isPast = state !== 'idle' && lineIndex < currentLineIndex;
                const isFuture = state !== 'idle' && lineIndex > currentLineIndex;
                const distanceFromCurrent = lineIndex - currentLineIndex;

                // Calculate opacity for progressive fade
                let lineOpacity = 1;
                if (state !== 'idle') {
                  if (isPast) lineOpacity = 0.4;
                  else if (isFuture) {
                    lineOpacity = Math.max(0.15, 1 - distanceFromCurrent * 0.3);
                  }
                }

                // For the current line, count words relative to when the line became active
                // (not the absolute script position) so accumulated misses don't create a gap.
                const wordsSpokenOnLine = isCurrent
                  ? Math.max(0, speech.spokenWordCount - lineActivationCountRef.current)
                  : Math.max(0, speech.spokenWordCount - lineStartIndex);

                const lineWords = words.map((word, wi) => {
                  globalWordIndex++;
                  const isSpoken = state !== 'idle' && wi < wordsSpokenOnLine;
                  return (
                    <Text
                      key={wi}
                      style={[
                        styles.lineText,
                        {
                          fontSize: vw * 0.085,
                          lineHeight: vw * 0.085 * 1.2,
                        },
                        isSpoken && isCurrent && styles.wordSpoken,
                        isPast && { color: COLORS.textMuted },
                      ]}
                    >
                      {word}{wi < words.length - 1 ? ' ' : ''}
                    </Text>
                  );
                });

                return (
                  <View
                    key={lineIndex}
                    onLayout={(e) => {
                      lineHeightsRef.current[lineIndex] = e.nativeEvent.layout.height;
                    }}
                    style={[
                      styles.lineContainer,
                      isCurrent && styles.lineHighlight,
                      { opacity: lineOpacity },
                    ]}
                  >
                    <Text>{lineWords}</Text>
                  </View>
                );
              });
            })()
          ) : (
            <Text style={styles.noScriptText}>
              No script — just speak freely.
            </Text>
          )}
        </ScrollView>
        <GradientOverlay position="bottom" height={220} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {state === 'idle' && (
          <Pressable
            style={[styles.recordButton, { width: vw * 0.86 }]}
            onPress={handleStartRecording}
          >
            <Ionicons name="mic" size={24} color={COLORS.white} />
          </Pressable>
        )}

        {(state === 'recording' || state === 'paused') && (
          <View style={[styles.recordingRow, { width: vw * 0.86 }]}>
            {/* Restart */}
            <Pressable style={styles.circleButton} onPress={handleRestart}>
              <Ionicons name="refresh" size={24} color={COLORS.text} />
            </Pressable>

            {/* Finish */}
            <Pressable
              style={styles.finishButton}
              onPress={handleFinishRecording}
            >
              <Text style={styles.finishText}>Finish</Text>
            </Pressable>

            {/* Pause / Resume */}
            <Pressable
              style={styles.circleButton}
              onPress={state === 'recording' ? handlePauseRecording : handleResumeRecording}
            >
              <Ionicons
                name={state === 'recording' ? 'pause' : 'mic'}
                size={24}
                color={COLORS.text}
              />
            </Pressable>
          </View>
        )}

        {state === 'done' && pendingRecording && (
          <View style={styles.doneContainer}>
            <View style={styles.previewWrapper}>
              <RecordingPreview
                uri={pendingRecording.uri}
                title={title ?? 'My Affirmation'}
                durationSeconds={pendingRecording.durationSeconds}
              />
            </View>
            <View style={[styles.doneRow, { width: vw * 0.86 }]}>
              <Pressable
                style={styles.restartButton}
                onPress={handleRestart}
                disabled={isSaving}
              >
                <Ionicons name="refresh" size={24} color={COLORS.text} />
                <Text style={styles.restartText}>Restart</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scriptContainer: {
    flex: 1,
    marginTop: 16,
  },
  scriptScroll: {
    flex: 1,
    paddingHorizontal: 25,
  },
  scriptContent: {
    paddingTop: 80,
    paddingBottom: 120,
  },
  lineContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 13,
    marginBottom: 30,
  },
  lineHighlight: {
    backgroundColor: 'rgba(45, 30, 60, 0.1)',
  },
  lineText: {
    fontFamily: FONTS.bodyMedium,
    color: COLORS.text,
  },
  wordSpoken: {
    fontFamily: FONTS.bodyBold,
  },
  noScriptText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 80,
  },
  controls: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  recordButton: {
    height: 74,
    borderRadius: 100,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButton: {
    flex: 1,
    height: 74,
    borderRadius: 100,
    backgroundColor: 'rgba(45, 30, 60, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.text,
  },
  doneContainer: {
    alignItems: 'center',
    gap: 16,
  },
  previewWrapper: {
    width: '83%',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restartButton: {
    flex: 1,
    height: 72,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  restartText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.text,
  },
  saveButton: {
    flex: 1,
    height: 72,
    borderRadius: 100,
    backgroundColor: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.white,
  },
});
