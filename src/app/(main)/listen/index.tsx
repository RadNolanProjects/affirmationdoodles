import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GradientOverlay } from '@/components/ui/GradientOverlay';
import { useAffirmations } from '@/hooks/useAffirmations';
import { usePlayback } from '@/hooks/usePlayback';
import { useListeningSession } from '@/hooks/useListeningSession';
import { getAudioUrl } from '@/lib/storage';
import { COLORS, FONTS } from '@/lib/constants';
import type { Affirmation } from '@/types';

export default function ListenScreen() {
  const { affirmations } = useAffirmations();
  const { playlistIds: playlistIdsParam } = useLocalSearchParams<{ playlistIds?: string }>();
  const { createSession } = useListeningSession();
  const scrollRef = useRef<ScrollView>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const trackCompletedRef = useRef(false);

  // Build playlist from params or fallback to single random
  const playlist = useMemo(() => {
    if (playlistIdsParam) {
      const ids = playlistIdsParam.split(',');
      return ids
        .map((id) => affirmations.find((a) => a.id === id))
        .filter(Boolean) as Affirmation[];
    }
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return [];
    return [active[Math.floor(Math.random() * active.length)]];
  }, [affirmations, playlistIdsParam]);

  // Pre-fetch all signed URLs upfront so track switches are instant
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  useEffect(() => {
    playlist.forEach((aff) => {
      if (aff.audio_url && !urlCache[aff.audio_url]) {
        getAudioUrl(aff.audio_url).then((url) => {
          setUrlCache((prev) => ({ ...prev, [aff.audio_url!]: url }));
        }).catch(() => {});
      }
    });
  }, [playlist]);

  const currentAffirmation = playlist[currentIndex] ?? null;
  const totalTracks = playlist.length;
  const currentResolvedUrl = currentAffirmation?.audio_url
    ? urlCache[currentAffirmation.audio_url] ?? null
    : null;

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
  } = usePlayback(currentAffirmation, { autoPlay: true, resolvedUrl: currentResolvedUrl });

  // Create session on mount (one session per playlist run)
  useEffect(() => {
    if (currentAffirmation && !sessionId) {
      createSession(currentAffirmation.id)
        .then((s) => setSessionId(s.id))
        .catch(() => {});
    }
  }, [currentAffirmation?.id]);

  // Reset completion flag when track changes
  useEffect(() => {
    trackCompletedRef.current = false;
  }, [currentIndex]);

  // Scroll to current line
  useEffect(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, currentLineIndex * 60 - 120),
      animated: true,
    });
  }, [currentLineIndex]);

  // Handle track completion — advance playlist or finish
  useEffect(() => {
    if (trackCompletedRef.current) return;
    if (
      status.isLoaded &&
      !status.playing &&
      currentTime > 0 &&
      duration > 0 &&
      currentTime >= duration - 0.5
    ) {
      trackCompletedRef.current = true;
      if (currentIndex < totalTracks - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        handleComplete();
      }
    }
  }, [status.playing, currentTime, duration, status.isLoaded]);

  const handleComplete = useCallback(() => {
    router.replace({
      pathname: '/(main)/listen/doodle',
      params: {
        sessionId: sessionId ?? '',
        affirmationTitle: playlist[0]?.title ?? '',
      },
    });
  }, [sessionId, playlist]);

  // Compute total playlist duration and elapsed time across all tracks
  const totalPlaylistDuration = useMemo(
    () => playlist.reduce((sum, a) => sum + (a.audio_duration_seconds ?? 0), 0),
    [playlist]
  );

  const elapsedTime = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      elapsed += playlist[i]?.audio_duration_seconds ?? 0;
    }
    elapsed += currentTime;
    return elapsed;
  }, [playlist, currentIndex, currentTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!currentAffirmation) {
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
        {/* Time: current/total */}
        <View style={styles.timeRow}>
          <Text style={styles.timeCurrent}>{formatTime(elapsedTime)}</Text>
          <Text style={styles.timeTotal}>/{formatTime(totalPlaylistDuration)}</Text>
        </View>

        {/* Segmented progress bar */}
        <View style={styles.segmentRow}>
          {playlist.map((track, i) => {
            const trackDuration = track.audio_duration_seconds ?? 0;
            const isActive = i === currentIndex;
            const isDone = i < currentIndex;
            const fillPercent = isDone
              ? 100
              : isActive && trackDuration > 0
                ? Math.min((currentTime / trackDuration) * 100, 100)
                : 0;

            return (
              <View
                key={track.id}
                style={[
                  styles.segment,
                  isActive ? styles.segmentActive : styles.segmentInactive,
                ]}
              >
                {fillPercent > 0 && (
                  <View
                    style={[
                      styles.segmentFill,
                      { width: `${fillPercent}%` },
                      isActive ? styles.segmentFillActive : styles.segmentFillDone,
                    ]}
                  />
                )}
              </View>
            );
          })}
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeCurrent: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  timeTotal: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
    fontVariant: ['tabular-nums'],
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 4,
    width: '70%',
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    borderRadius: 100,
    overflow: 'hidden',
  },
  segmentActive: {
    height: 5,
    backgroundColor: 'rgba(45,30,60,0.2)',
  },
  segmentInactive: {
    height: 3,
    backgroundColor: 'rgba(45,30,60,0.2)',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 100,
  },
  segmentFillActive: {
    backgroundColor: 'rgba(45,30,60,0.5)',
  },
  segmentFillDone: {
    backgroundColor: 'rgba(45,30,60,0.5)',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: COLORS.text,
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
    backgroundColor: COLORS.text,
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
