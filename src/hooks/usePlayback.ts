import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getAudioUrl } from '@/lib/storage';
import { splitIntoSentences } from '@/lib/text';
import type { Affirmation, ScriptLine } from '@/types';

export function usePlayback(affirmation: Affirmation | null, options?: { autoPlay?: boolean; resolvedUrl?: string | null }) {
  const autoPlay = options?.autoPlay ?? false;
  const resolvedUrl = options?.resolvedUrl;
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const sourceLoadedRef = useRef(false);
  // Track which source the player has actually loaded so auto-play doesn't fire on stale state
  const [readySource, setReadySource] = useState<string | null>(null);
  const pendingAutoPlay = useRef(false);

  useEffect(() => {
    sourceLoadedRef.current = false;
    setReadySource(null);
    if (autoPlay) pendingAutoPlay.current = true;
    setCurrentLineIndex(0);
    if (resolvedUrl) {
      // URL already pre-fetched — use immediately
      setAudioSource(resolvedUrl);
      sourceLoadedRef.current = true;
    } else if (affirmation?.audio_url) {
      getAudioUrl(affirmation.audio_url).then((url) => {
        setAudioSource(url);
        sourceLoadedRef.current = true;
      }).catch(() => {});
    }
  }, [affirmation?.audio_url, resolvedUrl]);

  const player = useAudioPlayer(audioSource ? { uri: audioSource } : null);
  const status = useAudioPlayerStatus(player);

  // Explicitly replace source when the signed URL resolves after initial render
  useEffect(() => {
    if (audioSource && player && sourceLoadedRef.current) {
      player.replace({ uri: audioSource });
    }
  }, [audioSource]);

  // Mark when the player has loaded the current source
  useEffect(() => {
    if (status.isLoaded && audioSource) {
      setReadySource(audioSource);
    }
  }, [status.isLoaded, audioSource]);

  // Auto-play once the NEW source is loaded (readySource matches audioSource)
  useEffect(() => {
    if (pendingAutoPlay.current && readySource && readySource === audioSource && !status.playing) {
      pendingAutoPlay.current = false;
      player.play();
    }
  }, [readySource, audioSource, status.playing]);

  const scriptLines: ScriptLine[] = useMemo(
    () =>
      splitIntoSentences(affirmation?.script ?? '')
        .map((text, index) => ({ index, text })),
    [affirmation?.script]
  );

  // Sync current line to playback position
  useEffect(() => {
    if (!status.isLoaded || !affirmation?.audio_duration_seconds) return;
    const totalLines = scriptLines.length;
    if (totalLines === 0) return;

    const secondsPerLine = affirmation.audio_duration_seconds / totalLines;
    const newLineIndex = Math.min(
      Math.floor(status.currentTime / secondsPerLine),
      totalLines - 1
    );
    setCurrentLineIndex(newLineIndex);
  }, [status.currentTime, status.isLoaded, scriptLines.length, affirmation?.audio_duration_seconds]);

  const play = useCallback(() => player.play(), [player]);
  const pause = useCallback(() => player.pause(), [player]);
  const seekTo = useCallback((seconds: number) => player.seekTo(seconds), [player]);

  return {
    player,
    status,
    scriptLines,
    currentLineIndex,
    isPlaying: status.playing,
    isLoaded: status.isLoaded,
    currentTime: status.currentTime,
    duration: status.duration,
    play,
    pause,
    seekTo,
  };
}
