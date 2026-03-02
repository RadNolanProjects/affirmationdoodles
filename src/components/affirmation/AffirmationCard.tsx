import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Waveform } from './Waveform';
import { getAudioUrl } from '@/lib/storage';
import { COLORS, FONTS } from '@/lib/constants';
import type { Affirmation } from '@/types';

type AffirmationCardProps = {
  affirmation: Affirmation;
  onReRecord?: () => void;
  onDelete?: () => void;
};

export function AffirmationCard({ affirmation, onReRecord, onDelete }: AffirmationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const hasMenu = !!(onReRecord || onDelete);
  const [audioSignedUrl, setAudioSignedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const player = useAudioPlayer(audioSignedUrl ?? '');
  const status = useAudioPlayerStatus(player);

  // Fetch signed audio URL
  useEffect(() => {
    if (affirmation.audio_url) {
      getAudioUrl(affirmation.audio_url)
        .then(setAudioSignedUrl)
        .catch(() => {});
    }
  }, [affirmation.audio_url]);

  // Track playback state
  useEffect(() => {
    if (status.playing) {
      setIsPlaying(true);
      if (status.duration > 0) {
        setProgress(status.currentTime / status.duration);
      }
    } else {
      if (isPlaying && status.currentTime === 0) {
        // Playback ended
        setIsPlaying(false);
        setProgress(0);
      }
    }
  }, [status.playing, status.currentTime, status.duration]);

  const handlePlayToggle = useCallback(() => {
    if (!audioSignedUrl) return;

    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.seekTo(0);
      player.play();
      setIsPlaying(true);
    }
  }, [player, audioSignedUrl, isPlaying]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `(${m}:${String(s).padStart(2, '0')})`;
  };

  return (
    <View style={styles.card}>
      {/* Top row: play button + info + waveform */}
      <View style={styles.topRow}>
        <Pressable
          style={styles.playButton}
          onPress={handlePlayToggle}
          disabled={!audioSignedUrl}
        >
          <Ionicons
            name={isPlaying ? 'stop' : 'play'}
            size={18}
            color={COLORS.white}
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </Pressable>

        <View style={styles.info}>
          <Text style={styles.title}>{affirmation.title}</Text>
          <Text style={styles.meta}>
            Recorded {formatDate(affirmation.created_at)}{' '}
            {formatDuration(affirmation.audio_duration_seconds)}
          </Text>
          <View style={styles.waveformContainer}>
            <Waveform
              audioUrl={audioSignedUrl}
              height={16}
              barCount={80}
              progress={isPlaying ? progress : 0}
            />
          </View>
        </View>

        {hasMenu && (
          <Pressable
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.text} />
          </Pressable>
        )}
      </View>

      {/* Menu dropdown */}
      {showMenu && (
        <View style={styles.menu}>
          {onReRecord && (
            <Pressable
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); onReRecord(); }}
            >
              <Ionicons name="mic-outline" size={16} color={COLORS.text} />
              <Text style={styles.menuItemText}>Re-record</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); onDelete(); }}
            >
              <Ionicons name="trash-outline" size={16} color="#D32F2F" />
              <Text style={[styles.menuItemText, { color: '#D32F2F' }]}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Script accordion */}
      <Pressable
        style={styles.accordion}
        onPress={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <Text style={styles.scriptText}>{affirmation.script.replace(/\n+/g, ' ').trim()}</Text>
        ) : (
          <Text style={styles.accordionLabel}>Script</Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={COLORS.text}
        />
      </Pressable>
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
  menuButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  menuItemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.text,
  },
  accordion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  accordionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 11,
  },
  scriptText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 14,
    flex: 1,
    marginRight: 8,
  },
});
