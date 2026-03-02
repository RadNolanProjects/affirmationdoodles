import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS } from '@/lib/constants';

type WaveformProps = {
  audioUrl: string | null;
  barCount?: number;
  height?: number;
  barColor?: string;
  progress?: number; // 0-1, for playback progress highlighting
};

export function Waveform({
  audioUrl,
  barCount = 80,
  height = 16,
  barColor = COLORS.text,
  progress = 0,
}: WaveformProps) {
  const [amplitudes, setAmplitudes] = useState<number[]>([]);

  useEffect(() => {
    if (!audioUrl) {
      setAmplitudes(generatePlaceholder(barCount));
      return;
    }

    if (Platform.OS === 'web') {
      extractWaveformWeb(audioUrl, barCount)
        .then(setAmplitudes)
        .catch(() => setAmplitudes(generatePlaceholder(barCount)));
    } else {
      // Native: use placeholder for now
      setAmplitudes(generatePlaceholder(barCount));
    }
  }, [audioUrl, barCount]);

  if (amplitudes.length === 0) return null;

  const progressIndex = Math.floor(progress * amplitudes.length);

  return (
    <View style={[styles.container, { height }]}>
      {amplitudes.map((amp, i) => {
        const barHeight = Math.max(2, amp * height);
        const isPlayed = i < progressIndex;
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: barColor,
                opacity: isPlayed ? 1 : 0.35,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function generatePlaceholder(count: number): number[] {
  const amps: number[] = [];
  for (let i = 0; i < count; i++) {
    // Generate a natural-looking waveform pattern
    const base = 0.3 + Math.random() * 0.5;
    const wave = Math.sin(i * 0.3) * 0.2;
    amps.push(Math.min(1, Math.max(0.1, base + wave)));
  }
  return amps;
}

async function extractWaveformWeb(
  url: string,
  barCount: number
): Promise<number[]> {
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / barCount);
    const amplitudes: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const start = i * samplesPerBar;
      for (let j = start; j < start + samplesPerBar && j < channelData.length; j++) {
        sum += Math.abs(channelData[j]);
      }
      amplitudes.push(sum / samplesPerBar);
    }

    // Normalize to 0-1
    const max = Math.max(...amplitudes, 0.01);
    return amplitudes.map((a) => a / max);
  } finally {
    audioContext.close();
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    borderRadius: 1,
    minWidth: 1.5,
  },
});
