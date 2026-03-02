import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Waveform } from './Waveform';
import { COLORS, FONTS } from '@/lib/constants';

type RecordingPreviewProps = {
  uri: string;
  title: string;
  durationSeconds: number;
};

export function RecordingPreview({ uri, title, durationSeconds }: RecordingPreviewProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status.playing) {
      setIsPlaying(true);
      if (status.duration > 0) {
        setProgress(status.currentTime / status.duration);
      }
    } else {
      if (isPlaying && status.currentTime === 0) {
        setIsPlaying(false);
        setProgress(0);
      }
    }
  }, [status.playing, status.currentTime, status.duration]);

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.seekTo(0);
      player.play();
      setIsPlaying(true);
    }
  }, [player, isPlaying]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `(${m}:${String(s).padStart(2, '0')})`;
  };

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Pressable style={styles.playButton} onPress={handlePlayToggle}>
          <Ionicons
            name={isPlaying ? 'stop' : 'play'}
            size={18}
            color={COLORS.white}
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </Pressable>

        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            Recorded {today} {formatDuration(durationSeconds)}
          </Text>
          <View style={styles.waveformContainer}>
            <Waveform
              audioUrl={uri}
              height={16}
              barCount={80}
              progress={isPlaying ? progress : 0}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16,
    shadowColor: '#B2B2B2',
    shadowOffset: { width: 10, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'flex-start',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 17,
  },
  meta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 11,
  },
  waveformContainer: {
    height: 16,
    overflow: 'hidden',
  },
});
