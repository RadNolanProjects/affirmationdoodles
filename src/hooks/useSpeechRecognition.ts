import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

type SpeechRecognitionHook = {
  spokenWordCount: number;
  isListening: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
};

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [spokenWordCount, setSpokenWordCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseWordCountRef = useRef(0);
  const latestCountRef = useRef(0);
  const shouldListenRef = useRef(false);

  // Only allow word count to increase — interim results can fluctuate
  const updateCount = useCallback((count: number) => {
    if (count > latestCountRef.current) {
      latestCountRef.current = count;
      setSpokenWordCount(count);
    }
  }, []);

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let totalWords = 0;
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (transcript) {
          totalWords += transcript.split(/\s+/).length;
        }
      }
      updateCount(baseWordCountRef.current + totalWords);
    };

    recognition.onerror = (event: any) => {
      // "aborted" is expected when stop() is called — not a real error
      if (event.error === 'aborted') return;
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // Auto-restart with a fresh instance if we're still supposed to be listening
      if (shouldListenRef.current) {
        baseWordCountRef.current = latestCountRef.current;
        const fresh = createRecognition();
        if (fresh) {
          recognitionRef.current = fresh;
          try {
            fresh.start();
          } catch {
            shouldListenRef.current = false;
            setIsListening(false);
          }
        }
      }
    };

    return recognition;
  }, [updateCount]);

  const start = useCallback(() => {
    if (Platform.OS !== 'web') return;

    // Stop any existing instance first
    if (recognitionRef.current) {
      shouldListenRef.current = false;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    baseWordCountRef.current = latestCountRef.current;
    shouldListenRef.current = true;

    const recognition = createRecognition();
    if (!recognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      shouldListenRef.current = false;
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try {
        ref.stop();
      } catch {}
      setIsListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    latestCountRef.current = 0;
    baseWordCountRef.current = 0;
    setSpokenWordCount(0);
  }, [stop]);

  return { spokenWordCount, isListening, start, stop, reset };
}
