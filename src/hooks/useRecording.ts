import { useCallback, useRef, useState } from 'react';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';

export function useRecording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    segmentStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const segmentTime = (Date.now() - segmentStartRef.current) / 1000;
      setDuration(accumulatedRef.current + segmentTime);
    }, 200);
  }, [clearTimer]);

  const requestPermissions = useCallback(async () => {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    return status.granted;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    const granted = await requestPermissions();
    if (!granted) throw new Error('Microphone permission denied');

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      const msg = e?.message || 'Failed to start recorder';
      console.error('Recording failed:', msg);
      setError(msg);
      throw new Error(msg);
    }

    setIsRecording(true);
    setIsPaused(false);
    setDuration(0);
    accumulatedRef.current = 0;
    startTimer();
  }, [recorder, requestPermissions, startTimer]);

  const pauseRecording = useCallback(() => {
    recorder.pause();
    clearTimer();
    // Accumulate elapsed time from this segment
    const segmentTime = (Date.now() - segmentStartRef.current) / 1000;
    accumulatedRef.current += segmentTime;
    setIsPaused(true);
  }, [recorder, clearTimer]);

  const resumeRecording = useCallback(() => {
    recorder.record();
    setIsPaused(false);
    startTimer();
  }, [recorder, startTimer]);

  const stopRecording = useCallback(async () => {
    clearTimer();
    // Accumulate final segment
    const segmentTime = (Date.now() - segmentStartRef.current) / 1000;
    accumulatedRef.current += segmentTime;

    await recorder.stop();
    setIsRecording(false);
    setIsPaused(false);

    return {
      uri: recorder.uri,
      durationSeconds: Math.round(accumulatedRef.current),
    };
  }, [recorder, clearTimer]);

  const resetRecording = useCallback(() => {
    clearTimer();
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setError(null);
    accumulatedRef.current = 0;
  }, [clearTimer]);

  return {
    isRecording,
    isPaused,
    duration,
    error,
    uri: recorder.uri,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
