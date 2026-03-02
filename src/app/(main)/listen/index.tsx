import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientOverlay } from '@/components/ui/GradientOverlay';
import { useAffirmations } from '@/hooks/useAffirmations';
import { usePlayback } from '@/hooks/usePlayback';
import { useListeningSession } from '@/hooks/useListeningSession';
import { COLORS, FONTS } from '@/lib/constants';

export default function ListenScreen() {
  const { affirmations } = useAffirmations();
  const { createSession, completeSession } = useListeningSession();
  const scrollRef = useRef<ScrollView>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Pick a random active affirmation with audio
  const affirmation = useMemo(() => {
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)];
  }, [affirmations]);

  const {
    scriptLines,
    currentLineIndex,
    isPlaying,
    isLoaded,
    currentTime,
    duration,
    play,
    pause,
    status,
  } = usePlayback(affirmation);

  // Create session on mount
  useEffect(() => {
    if (affirmation && !sessionId) {
      createSession(affirmation.id).then((s) => setSessionId(s.id)).catch(() => {});
    }
  }, [affirmation?.id]);

  // Scroll to current line
  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, currentLineIndex * 60 - 120),
      animated: true,
    });
  }, [currentLineIndex]);

  // Handle playback complete
  useEffect(() => {
    if (status.isLoaded && !status.playing && currentTime > 0 && duration > 0 && currentTime >= duration - 0.5) {
      handleComplete();
    }
  }, [status.playing, currentTime, duration, status.isLoaded]);

  const handleComplete = useCallback(async () => {
    if (sessionId) {
      await completeSession(sessionId).catch(() => {});
    }
    router.replace('/(main)/listen/complete');
  }, [sessionId, completeSession]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  // Auto-play when loaded
  useEffect(() => {
    if (isLoaded && !isPlaying) {
      play();
    }
  }, [isLoaded]);

  if (!affirmation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No affirmations to play.{'\n'}Record one first!
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Hear it." />

      {/* Scrolling Text */}
      <View style={styles.textContainer}>
        <GradientOverlay position="top" height={100} />
        <ScrollView
          ref={scrollRef}
          style={styles.textScroll}
          contentContainerStyle={styles.textContent}
          showsVerticalScrollIndicator={false}
        >
          {scriptLines.map((line, index) => {
            const isCurrent = index === currentLineIndex;
            const isPast = index < currentLineIndex;

            return (
              <Text
                key={index}
                style={[
                  styles.line,
                  isCurrent && styles.lineCurrent,
                  isPast && styles.linePast,
                  !isCurrent && !isPast && styles.lineFuture,
                ]}
              >
                {line.text}
              </Text>
            );
          })}
        </ScrollView>
        <GradientOverlay position="bottom" height={100} />
      </View>

      {/* Playback Controls */}
      <View style={styles.controls}>
        <Text style={styles.timeDisplay}>{formatTime(currentTime)}</Text>

        {/* Simple progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
              },
            ]}
          />
        </View>

        <Pressable
          style={styles.playPauseButton}
          onPress={isPlaying ? pause : play}
        >
          {isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <Text style={styles.playIcon}>{'\u25B6'}</Text>
          )}
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
  textContainer: {
    flex: 1,
    marginTop: 8,
  },
  textScroll: {
    flex: 1,
    paddingHorizontal: 25,
  },
  textContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  line: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '700',
    marginBottom: 16,
    color: COLORS.textMuted,
  },
  lineCurrent: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 40,
  },
  linePast: {
    color: COLORS.textMuted,
    opacity: 0.5,
  },
  lineFuture: {
    color: COLORS.textMuted,
    opacity: 0.3,
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  timeDisplay: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '60%',
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.text,
    borderRadius: 2,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: COLORS.white,
    fontSize: 24,
    marginLeft: 4,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 5,
    height: 24,
    backgroundColor: COLORS.white,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    textDecorationLine: 'underline',
  },
});
