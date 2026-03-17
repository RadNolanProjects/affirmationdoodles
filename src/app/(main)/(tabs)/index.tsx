import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAffirmations } from '@/hooks/useAffirmations';
import { useListeningSession } from '@/hooks/useListeningSession';
import { COLORS, FONTS } from '@/lib/constants';
import { deleteAudio, getAudioUrl } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { DoodleThumbnail } from '@/components/doodle/DoodleThumbnail';
import { Confetti } from '@/components/ui/Confetti';
import { SCRIPT_CATEGORIES } from '@/app/(main)/create/index';
import type { Affirmation, DoodleData, ListeningSession } from '@/types';

type SessionWithTitle = ListeningSession & {
  affirmations: { title: string } | null;
};

const SHEET_COLLAPSED = 130;
const SHEET_COLLAPSED_COMPLETE = 80;
// Base: handle(36) + header(32) + card padding(32) + CTA(76) + spacing(16)
// Per item: play dot(16) + content padding(4) + title line(17) = ~37, plus line(24) between items
const SHEET_ITEM_HEIGHT = 40;
const SHEET_ITEM_LINE = 24;
const SHEET_BASE_HEIGHT = 192;
function sheetHeightForCount(count: number) {
  if (count === 0) return 340; // FTUE: welcome text + script card slider + CTA
  return SHEET_BASE_HEIGHT + count * SHEET_ITEM_HEIGHT + Math.max(0, count - 1) * SHEET_ITEM_LINE;
}
const SHEET_EXPANDED_COMPLETE = 500;
const SNAP_THRESHOLD = 60;
const EMPTY_TRAIL_CELLS = 140;

// FTUE: scripts marked ftue:true in SCRIPT_CATEGORIES
const FTUE_SCRIPT_POOL = SCRIPT_CATEGORIES.flatMap((c) =>
  c.scripts.filter((s) => s.ftue)
);

function parseDoodleData(raw: string | null): DoodleData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoodleData;
  } catch {
    return null;
  }
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TimelineItem({
  affirmation,
  isFirst,
  isLast,
  checked,
  onToggleCheck,
  playingId,
  onTogglePlay,
}: {
  affirmation: Affirmation;
  isFirst: boolean;
  isLast: boolean;
  checked: boolean;
  onToggleCheck: (id: string) => void;
  playingId: string | null;
  onTogglePlay: (id: string | null) => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const isActive = playingId === affirmation.id;

  useEffect(() => {
    if (affirmation.audio_url) {
      getAudioUrl(affirmation.audio_url).then(setAudioUrl).catch(() => {});
    }
  }, [affirmation.audio_url]);

  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const status = useAudioPlayerStatus(player);

  // Pause (not stop) when another item takes over
  useEffect(() => {
    if (!isActive && status.playing) {
      player.pause();
    }
  }, [isActive]);

  // Auto-clear when track ends naturally
  useEffect(() => {
    if (
      isActive &&
      !status.playing &&
      status.currentTime > 0 &&
      status.duration > 0 &&
      status.currentTime >= status.duration - 0.5
    ) {
      onTogglePlay(null);
    }
  }, [status.playing, status.currentTime]);

  const handlePress = () => {
    if (!audioUrl) return;
    if (isActive) {
      // Toggle pause/resume
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } else {
      // Switch to this track — start from beginning
      if (status.isLoaded) {
        player.seekTo(0);
        player.play();
      }
      onTogglePlay(affirmation.id);
    }
  };

  const progress =
    isActive && status.duration > 0
      ? status.currentTime / status.duration
      : 0;

  return (
    <View style={styles.timelineItem}>
      {/* Progress fill background */}
      {progress > 0 && (
        <View
          style={[
            styles.timelineProgressFill,
            { width: `${progress * 100}%` },
          ]}
        />
      )}

      {/* Checkbox */}
      <Pressable
        onPress={() => onToggleCheck(affirmation.id)}
        style={styles.timelineCheckbox}
        hitSlop={8}
      >
        <View style={[styles.timelineCheckboxBox, checked && styles.timelineCheckboxChecked]}>
          {checked && <Ionicons name="checkmark" size={11} color={COLORS.white} />}
        </View>
      </Pressable>

      {/* Marker column with lines */}
      <View style={styles.timelineMarkerCol}>
        <View style={[styles.timelineVertLine, isFirst && { opacity: 0 }]} />
        <Pressable onPress={handlePress}>
          <View style={styles.timelinePlayDot}>
            <Ionicons
              name={isActive && status.playing ? 'pause' : 'play'}
              size={8}
              color={COLORS.white}
              style={!(isActive && status.playing) ? { marginLeft: 1 } : undefined}
            />
          </View>
        </Pressable>
        <View style={[styles.timelineVertLine, isLast && { opacity: 0 }]} />
      </View>

      {/* Content */}
      <Pressable onPress={handlePress} style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
        <Text style={[styles.timelineTitle, !checked && styles.timelineTitleUnchecked]}>
          {affirmation.title}
          <Text style={styles.timelineDuration}>
            {` (${formatDuration(affirmation.audio_duration_seconds)})`}
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}

const MANAGE_CHROME = 180; // handle + header + bottomBar
const MANAGE_ITEM_EST = 80; // estimated height per item + gap

function ManageItem({
  affirmation,
  playingId,
  onTogglePlay,
  onReRecord,
  onDelete,
}: {
  affirmation: Affirmation;
  playingId: string | null;
  onTogglePlay: (id: string | null) => void;
  onReRecord: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const isActive = playingId === affirmation.id;

  useEffect(() => {
    if (affirmation.audio_url) {
      getAudioUrl(affirmation.audio_url).then(setAudioUrl).catch(() => {});
    }
  }, [affirmation.audio_url]);

  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!isActive && status.playing) player.pause();
  }, [isActive]);

  useEffect(() => {
    if (
      isActive && !status.playing &&
      status.currentTime > 0 && status.duration > 0 &&
      status.currentTime >= status.duration - 0.5
    ) {
      onTogglePlay(null);
    }
  }, [status.playing, status.currentTime]);

  const handlePlayPress = () => {
    if (!audioUrl) return;
    if (isActive) {
      if (status.playing) player.pause();
      else player.play();
    } else {
      if (status.isLoaded) {
        player.seekTo(0);
        player.play();
      }
      onTogglePlay(affirmation.id);
    }
  };

  const formatRecordedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const progress = isActive && status.duration > 0
    ? status.currentTime / status.duration
    : 0;

  return (
    <View style={styles.manageCard}>
      {progress > 0 && (
        <View style={[styles.manageProgressFill, { width: `${progress * 100}%` }]} />
      )}

      <View style={styles.manageRow}>
        <Pressable onPress={handlePlayPress} style={styles.managePlayBtn}>
          <Ionicons
            name={isActive && status.playing ? 'pause' : 'play'}
            size={14}
            color={COLORS.white}
            style={!(isActive && status.playing) ? { marginLeft: 2 } : undefined}
          />
        </Pressable>

        <Pressable style={styles.manageInfo} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.manageItemTitle}>{affirmation.title}</Text>
          <Text style={styles.manageItemMeta}>
            Recorded {formatRecordedDate(affirmation.created_at)}
            {' '}{formatDuration(affirmation.audio_duration_seconds)}
          </Text>
        </Pressable>

        <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.manageKebab}>
          <Ionicons name="ellipsis-vertical" size={16} color={COLORS.text} />
        </Pressable>
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.manageChevron}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.text} />
        </Pressable>
      </View>

      {showMenu && (
        <View style={styles.manageInlineMenu}>
          <Pressable
            style={styles.manageInlineMenuItem}
            onPress={() => { setShowMenu(false); onReRecord(); }}
          >
            <Ionicons name="mic-outline" size={16} color={COLORS.text} />
            <Text style={styles.manageInlineMenuText}>Re-record</Text>
          </Pressable>
          <Pressable
            style={styles.manageInlineMenuItem}
            onPress={() => { setShowMenu(false); onDelete(); }}
          >
            <Ionicons name="trash-outline" size={16} color="#D32F2F" />
            <Text style={[styles.manageInlineMenuText, { color: '#D32F2F' }]}>Delete</Text>
          </Pressable>
        </View>
      )}

      {expanded && (
        <Text style={styles.manageScript}>
          {affirmation.script.replace(/\n+/g, ' ').trim()}
        </Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const { width: vw, height: vh } = useWindowDimensions();
  const { affirmations, isLoading, fetchAffirmations, deleteAffirmation } = useAffirmations();
  const { getAllSessions, deleteSession, createSession, updateSessionDate } = useListeningSession();
  const [sessions, setSessions] = useState<SessionWithTitle[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewSession, setViewSession] = useState<SessionWithTitle | null>(null);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [manageListHeight, setManageListHeight] = useState(0);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const celebrationHandled = useRef(false);

  // Intro animation state (plays on every mount)
  const [introPhase, setIntroPhase] = useState<'typing' | 'settling' | 'gridReveal' | 'ready'>('typing');
  const [introTypedLength, setIntroTypedLength] = useState(0);
  const [ftueScripts, setFtueScripts] = useState(() => FTUE_SCRIPT_POOL.slice(0, 3));
  const introAnimStarted = useRef(false);
  // Separate animated values for sequenced stages
  const introTextY = useRef(new Animated.Value(0)).current;         // direct translateY for overlay text
  const introBgOpacity = useRef(new Animated.Value(1)).current;     // overlay background
  const introGridReveal = useRef(new Animated.Value(0)).current;    // grid fade + slide
  const introSheetReveal = useRef(new Animated.Value(0)).current;   // sheet slide from bottom
  const introHeroOpacity = useRef(new Animated.Value(0)).current;   // real hero text — starts hidden
  const heroRef = useRef<View>(null);
  const heroMeasuredCenterY = useRef<number | null>(null);

  const { justCompleted, completedTitle } = useLocalSearchParams<{
    justCompleted?: string;
    completedTitle?: string;
  }>();

  // Sheet state — use refs so panResponder closures read current values
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const initialHeight = sheetHeightForCount(0);
  const expandedRef = useRef(initialHeight);
  const completedRef = useRef(false);
  const sheetHeight = useRef(new Animated.Value(initialHeight)).current;
  const lastHeight = useRef(initialHeight);

  // Derive today's completion state
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const todaySession = useMemo(() => {
    return sessions.find(
      (s) => s.listened_at === todayStr && s.completed_at && s.doodle_data
    ) ?? null;
  }, [sessions, todayStr]);

  const todayDoodle = useMemo(
    () => parseDoodleData(todaySession?.doodle_data ?? null),
    [todaySession]
  );

  const todayCompleted = !!todayDoodle;

  // Today's playlist — up to 5 random active recordings
  const todaysPlaylist = useMemo(() => {
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length <= 5) return active;
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, [affirmations]);

  // Initialize checked IDs when playlist changes (all checked by default)
  useEffect(() => {
    setCheckedIds(new Set(todaysPlaylist.map((a) => a.id)));
  }, [todaysPlaylist]);

  const toggleChecked = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalPlaylistSeconds = useMemo(
    () => todaysPlaylist
      .filter((a) => checkedIds.has(a.id))
      .reduce((sum, a) => sum + (a.audio_duration_seconds ?? 0), 0),
    [todaysPlaylist, checkedIds]
  );

  // Recordings for manage view (all affirmations with audio)
  const recordings = useMemo(
    () => affirmations.filter((a) => a.audio_url),
    [affirmations]
  );

  const enterManage = () => {
    setPlayingId(null);
    setManageListHeight(recordings.length * MANAGE_ITEM_EST);
    setManageMode(true);
    setSheetExpanded(true);
  };

  const exitManage = () => {
    setPlayingId(null);
    setManageMode(false);
  };

  const handleManageReRecord = (affirmation: Affirmation) => {
    exitManage();
    router.push({
      pathname: '/(main)/create/record',
      params: {
        title: affirmation.title,
        script: affirmation.script,
        affirmationId: affirmation.id,
      },
    });
  };

  const handleManageDelete = async (affirmation: Affirmation) => {
    const doDelete = async () => {
      if (affirmation.audio_url) {
        try { await deleteAudio(affirmation.audio_url); } catch {}
      }
      await deleteAffirmation(affirmation.id);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${affirmation.title}"?\n\nThis cannot be undone.`)) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Affirmation',
        `Are you sure you want to delete "${affirmation.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  // Keep refs in sync for panResponder closures
  useEffect(() => {
    let newExpanded: number;
    if (manageMode) {
      newExpanded = Math.min(MANAGE_CHROME + manageListHeight, vh * 0.9);
    } else if (todayCompleted) {
      newExpanded = SHEET_EXPANDED_COMPLETE;
    } else {
      newExpanded = sheetHeightForCount(todaysPlaylist.length);
    }
    expandedRef.current = newExpanded;
    completedRef.current = todayCompleted;
    // Re-animate sheet if currently expanded
    if (sheetExpanded) {
      lastHeight.current = newExpanded;
      Animated.spring(sheetHeight, {
        toValue: newExpanded,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [todayCompleted, todaysPlaylist.length, manageMode, manageListHeight, vh]);

  // All completed sessions, newest first (allows multiple per day)
  // Interleave gray gap cells for skipped days between sessions,
  // and prepend gaps from today back to the most recent session
  const gridItems = useMemo(() => {
    const sorted = [...sessions]
      .filter((s) => s.doodle_data)
      .sort((a, b) => {
        const dateCompare = b.listened_at.localeCompare(a.listened_at);
        if (dateCompare !== 0) return dateCompare;
        return (b.completed_at ?? '').localeCompare(a.completed_at ?? '');
      });

    const items: ({ type: 'session'; session: SessionWithTitle } | { type: 'gap'; key: string })[] = [];

    // Prepend gap cells from today back to most recent session date
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    if (sorted.length > 0) {
      const [ry, rm, rd] = sorted[0].listened_at.split('-').map(Number);
      const recentDate = new Date(ry, rm - 1, rd);
      const daysSince = Math.round((todayDate.getTime() - recentDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let g = 0; g < daysSince; g++) {
        items.push({ type: 'gap', key: `gap-today-${g}` });
      }
    } else {
      // No sessions at all — show one gray cell for today
      items.push({ type: 'gap', key: 'gap-today-0' });
    }

    for (let i = 0; i < sorted.length; i++) {
      items.push({ type: 'session', session: sorted[i] });

      if (i < sorted.length - 1) {
        const [y1, m1, d1] = sorted[i].listened_at.split('-').map(Number);
        const [y2, m2, d2] = sorted[i + 1].listened_at.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1);
        const date2 = new Date(y2, m2 - 1, d2);
        const diffDays = Math.round((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
        for (let g = 1; g < diffDays; g++) {
          items.push({ type: 'gap', key: `gap-${sorted[i].listened_at}-${g}` });
        }
      }
    }

    return items;
  }, [sessions, todayStr]);

  const collapsedHeight = todayCompleted ? SHEET_COLLAPSED_COMPLETE : SHEET_COLLAPSED;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        const minH = completedRef.current ? SHEET_COLLAPSED_COMPLETE : SHEET_COLLAPSED;
        const maxH = expandedRef.current;
        const newHeight = Math.max(
          minH,
          Math.min(maxH, lastHeight.current - gesture.dy)
        );
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        const minH = completedRef.current ? SHEET_COLLAPSED_COMPLETE : SHEET_COLLAPSED;
        const maxH = expandedRef.current;
        const currentHeight = lastHeight.current - gesture.dy;
        const shouldExpand = gesture.dy < -SNAP_THRESHOLD ||
          (currentHeight > (minH + maxH) / 2 && gesture.dy <= SNAP_THRESHOLD);

        const target = shouldExpand ? maxH : minH;
        lastHeight.current = target;
        setSheetExpanded(shouldExpand);

        Animated.spring(sheetHeight, {
          toValue: target,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const toggleSheet = () => {
    const target = sheetExpanded ? collapsedHeight : expandedRef.current;
    lastHeight.current = target;
    setSheetExpanded(!sheetExpanded);
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAffirmations();
      loadHistory();
    }, [])
  );

  // Show celebration modal when returning from doodle completion
  useEffect(() => {
    if (justCompleted === '1' && !celebrationHandled.current) {
      celebrationHandled.current = true;
      setCelebrationVisible(true);
    }
  }, [justCompleted]);

  const loadHistory = async () => {
    try {
      const data = await getAllSessions();
      setSessions(data as SessionWithTitle[]);
    } catch {}
  };

  const handleRedoDoodle = () => {
    setMenuOpen(false);
    if (todaySession) {
      router.push({
        pathname: '/(main)/listen/doodle',
        params: {
          sessionId: todaySession.id,
          affirmationTitle: todaySession.affirmations?.title ?? '',
        },
      });
    }
  };

  const handleDeleteEntry = async () => {
    setMenuOpen(false);
    if (todaySession) {
      try {
        await deleteSession(todaySession.id);
        await loadHistory();
      } catch {}
    }
  };

  const handleLogAgain = async () => {
    setMenuOpen(false);
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return;
    const random = active[Math.floor(Math.random() * active.length)];
    try {
      const session = await createSession(random.id);
      router.push({
        pathname: '/(main)/listen/doodle',
        params: {
          sessionId: session.id,
          affirmationTitle: random.title,
        },
      });
    } catch {}
  };

  const handleDebugChangeDate = async (session: SessionWithTitle) => {
    if (Platform.OS === 'web') {
      const input = window.prompt('Debug: Set date (YYYY-MM-DD)', session.listened_at);
      if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return;
      try {
        await updateSessionDate(session.id, input);
        setViewSession(null);
        await loadHistory();
      } catch {}
    }
  };

  // View modal for past doodles
  const viewDoodle = useMemo(
    () => parseDoodleData(viewSession?.doodle_data ?? null),
    [viewSession]
  );

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Today';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const handleViewRedoDoodle = () => {
    const session = viewSession;
    setViewSession(null);
    if (session) {
      router.push({
        pathname: '/(main)/listen/doodle',
        params: {
          sessionId: session.id,
          affirmationTitle: session.affirmations?.title ?? '',
        },
      });
    }
  };

  const handleViewDeleteEntry = async () => {
    const session = viewSession;
    setViewSession(null);
    if (session) {
      try {
        await deleteSession(session.id);
        await loadHistory();
      } catch {}
    }
  };

  const handleViewLogAgain = async () => {
    setViewSession(null);
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return;
    const random = active[Math.floor(Math.random() * active.length)];
    try {
      const session = await createSession(random.id);
      router.push({
        pathname: '/(main)/listen/doodle',
        params: {
          sessionId: session.id,
          affirmationTitle: random.title,
        },
      });
    } catch {}
  };

  const heroText = 'I am more\nthan enough';

  const hasRecordedAffirmations = affirmations.some((a) => a.audio_url);

  const cellWidth = vw * 0.05;
  const cellHeight = cellWidth * 1.5;

  // Intro animation: grid fades and slides up
  const introGridOpacity = introGridReveal;
  const introGridSlideY = introGridReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });
  // Intro animation: sheet slides up from bottom — offset matches actual sheet height
  const introSheetSlideY = Animated.multiply(
    introSheetReveal.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    sheetHeight,
  );

  const easeInOut = Easing.inOut(Easing.ease);

  // Measure hero text position for seamless overlay→hero handoff
  useEffect(() => {
    if (heroRef.current) {
      const timer = setTimeout(() => {
        heroRef.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          heroMeasuredCenterY.current = y + h / 2;
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Intro animation — plays on mount: type → slide up → grid → sheet
  useEffect(() => {
    if (!introAnimStarted.current) {
      introAnimStarted.current = true;

      const startDelay = setTimeout(() => {
        const fullText = heroText;
        let i = 0;
        const interval = setInterval(() => {
          i++;
          setIntroTypedLength(i);
          if (i >= fullText.length) {
            clearInterval(interval);
            // Beat after typing completes
            setTimeout(() => {
              setIntroPhase('settling');

              // Calculate target: move overlay text center to hero text center
              const targetY = heroMeasuredCenterY.current != null
                ? heroMeasuredCenterY.current - vh / 2
                : -(vh * 0.28);

              // Stage 1: Slide overlay text up to hero position, fade bg
              Animated.parallel([
                Animated.timing(introTextY, {
                  toValue: targetY,
                  duration: 800,
                  easing: easeInOut,
                  useNativeDriver: true,
                }),
                Animated.timing(introBgOpacity, {
                  toValue: 0,
                  duration: 800,
                  easing: easeInOut,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Instant swap: hide overlay, show real hero in same frame
                introHeroOpacity.setValue(1);
                setIntroPhase('gridReveal');

                // Stage 2: Grid fades in + slides up
                Animated.timing(introGridReveal, {
                  toValue: 1,
                  duration: 600,
                  easing: easeInOut,
                  useNativeDriver: true,
                }).start(() => {
                  // Stage 3: Sheet slides up from bottom
                  Animated.timing(introSheetReveal, {
                    toValue: 1,
                    duration: 700,
                    easing: easeInOut,
                    useNativeDriver: true,
                  }).start(() => {
                    setIntroPhase('ready');
                  });
                });
              });
            }, 500);
          }
        }, 45);
      }, 500);

      return () => clearTimeout(startDelay);
    }
  }, []);

  const shuffleFtueScript = (index: number) => {
    setFtueScripts((prev) => {
      const currentTitles = new Set(prev.map((s) => s.title));
      const available = FTUE_SCRIPT_POOL.filter((s) => !currentTitles.has(s.title));
      if (available.length === 0) return prev;
      const next = [...prev];
      next[index] = available[Math.floor(Math.random() * available.length)];
      return next;
    });
  };

  const handleFtueStartRecording = () => {
    router.push({
      pathname: '/(main)/create/record',
      params: {
        title: ftueScripts[0].title,
        script: ftueScripts[0].script,
        ftueScripts: JSON.stringify(ftueScripts),
        ftueIndex: '0',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Scrollable content behind the sheet */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: vw * 0.07 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar with logout */}
        <Animated.View style={[styles.topBar, { opacity: introHeroOpacity }]}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push('/(main)/settings')}>
            <Text style={styles.settingsText}>Settings</Text>
          </Pressable>
        </Animated.View>

        {/* Hero Text */}
        <Animated.View ref={heroRef} style={{ opacity: introHeroOpacity }}>
          <Text
            style={[
              styles.heroText,
              {
                fontSize: vw * 0.24,
                lineHeight: vw * 0.24 * 0.8,
                letterSpacing: vw * -0.005,
              },
            ]}
          >
            {heroText}
          </Text>
        </Animated.View>

        {/* History Grid */}
        <Animated.View style={[styles.section, { opacity: introGridOpacity, transform: [{ translateY: introGridSlideY }] }]}>
          <Text style={styles.sectionLabel}>History</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.grid, { gap: vw * 0.01, marginTop: 16 }]}>
              {gridItems.map((item) => {
                if (item.type === 'gap') {
                  return (
                    <View
                      key={item.key}
                      style={[
                        {
                          width: cellWidth,
                          height: cellHeight,
                          borderRadius: vw * 0.01,
                        },
                        styles.gridCell,
                      ]}
                    />
                  );
                }

                const { session } = item;
                const doodle = parseDoodleData(session.doodle_data);

                return (
                  <Pressable key={session.id} onPress={() => setViewSession(session)}>
                    <View
                      style={[
                        {
                          width: cellWidth,
                          height: cellHeight,
                          borderRadius: vw * 0.01,
                        },
                        styles.gridCell,
                        doodle && styles.gridCellFilled,
                      ]}
                    >
                      {doodle && (
                        <DoodleThumbnail
                          doodleData={doodle}
                          width={cellWidth}
                          height={cellHeight}
                          inverted
                          borderRadius={vw * 0.01}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
              {/* Trailing empty cells */}
              {Array.from({ length: EMPTY_TRAIL_CELLS }).map((_, i) => (
                <View
                  key={`empty-${i}`}
                  style={[
                    {
                      width: cellWidth,
                      height: cellHeight,
                      borderRadius: vw * 0.01,
                    },
                    styles.gridCell,
                  ]}
                />
              ))}
            </View>
            {/* Gradient fade over trailing cells */}
            <LinearGradient
              colors={['transparent', COLORS.background]}
              style={styles.gridGradient}
              pointerEvents="none"
            />
          </View>
        </Animated.View>

        {/* Extra space so content isn't hidden behind sheet */}
        <Animated.View style={{ height: Animated.add(sheetHeight, 20) }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY: introSheetSlideY }] }]}>
        {/* Drag Handle — disabled in manage mode */}
        {manageMode ? (
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
        ) : (
          <View {...panResponder.panHandlers}>
            <Pressable style={styles.handleArea} onPress={toggleSheet}>
              <View style={styles.handle} />
            </Pressable>
          </View>
        )}

        {manageMode ? (
          <>
            {/* Manage header */}
            <View style={styles.manageHeader}>
              <Text style={styles.manageHeaderTitle}>All recordings</Text>
              <View style={styles.manageCountBadge}>
                <Text style={styles.manageCountText}>{recordings.length}</Text>
              </View>
            </View>

            {/* Scrollable list */}
            <ScrollView
              style={styles.manageScrollView}
              contentContainerStyle={styles.manageListContent}
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{ gap: 8 }}
                onLayout={(e) =>
                  setManageListHeight(e.nativeEvent.layout.height)
                }
              >
                {recordings.map((aff) => (
                  <ManageItem
                    key={aff.id}
                    affirmation={aff}
                    playingId={playingId}
                    onTogglePlay={setPlayingId}
                    onReRecord={() => handleManageReRecord(aff)}
                    onDelete={() => handleManageDelete(aff)}
                  />
                ))}
                {recordings.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No recordings yet.</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Bottom bar */}
            <View style={styles.manageBottomBar}>
              <Pressable onPress={exitManage} style={styles.manageBackBtn}>
                <Text style={styles.manageBackArrow}>{'\u2190'}</Text>
              </Pressable>
              <Button
                label="+ Add New"
                onPress={() => {
                  exitManage();
                  router.push('/(main)/create');
                }}
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : todayCompleted ? (
          <>
            {/* 3-dot menu — top-right of sheet */}
            <Pressable
              style={styles.menuButton}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.text} />
            </Pressable>

            {/* Completion: Expanded content */}
            {sheetExpanded && (
              <View style={styles.sheetContent}>
                {/* Doodle Preview */}
                <View style={styles.doodlePreviewWrapper}>
                  {todayDoodle && (
                    <DoodleThumbnail
                      doodleData={todayDoodle}
                      width={Math.min(vw * 0.45, 180)}
                      height={Math.min(vw * 0.45 * 1.5, 270)}
                      inverted
                      borderRadius={16}
                    />
                  )}
                </View>

                {/* Affirmation info */}
                <View style={styles.completionInfo}>
                  <Text style={styles.completionTitle}>
                    {todaySession?.affirmations?.title ?? 'Today\'s Affirmation'}
                  </Text>
                  <Text style={styles.completionDate}>Today</Text>
                </View>
              </View>
            )}

            {/* Completion: Collapsed peek */}
            {!sheetExpanded && (
              <View style={styles.collapsedComplete}>
                {todayDoodle && (
                  <DoodleThumbnail
                    doodleData={todayDoodle}
                    width={36}
                    height={36}
                    inverted
                    borderRadius={6}
                  />
                )}
                <Text style={styles.collapsedText} numberOfLines={1}>
                  {todaySession?.affirmations?.title ?? 'Affirmation'} complete
                </Text>
              </View>
            )}

            {/* Manage button — only when expanded */}
            {sheetExpanded && (
              <View style={styles.ctaArea}>
                <Pressable
                  style={styles.shareButton}
                  onPress={enterManage}
                >
                  <Ionicons name="library-outline" size={18} color={COLORS.white} />
                  <Text style={styles.shareLabel}>Manage Affirmations</Text>
                </Pressable>
              </View>
            )}

            {/* 3-dot menu modal */}
            <Modal
              visible={menuOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setMenuOpen(false)}
            >
              <Pressable
                style={styles.menuOverlay}
                onPress={() => setMenuOpen(false)}
              >
                <View style={styles.menuCard}>
                  <Pressable style={styles.menuItem} onPress={handleRedoDoodle}>
                    <Ionicons name="refresh" size={18} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Redo Doodle</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable style={styles.menuItem} onPress={handleLogAgain}>
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.text} />
                    <Text style={styles.menuItemText}>Log Again</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable style={styles.menuItem} onPress={handleDeleteEntry}>
                    <Ionicons name="trash-outline" size={18} color="#D14" />
                    <Text style={[styles.menuItemText, { color: '#D14' }]}>Delete Entry</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Modal>
          </>
        ) : (
          <>
            {/* Normal: Expandable content */}
            {sheetExpanded && (
              <View style={styles.sheetContent}>
                {hasRecordedAffirmations ? (
                  <View style={styles.playlistSection}>
                    <View style={styles.playlistHeader}>
                      <Text style={styles.sectionLabel}>
                        Today's affirmations ({formatDuration(totalPlaylistSeconds)})
                      </Text>
                      <Pressable onPress={enterManage}>
                        <Text style={styles.manageLink}>Library</Text>
                      </Pressable>
                    </View>
                    <View style={styles.timelineCard}>
                      {todaysPlaylist.map((aff, index) => (
                        <TimelineItem
                          key={aff.id}
                          affirmation={aff}
                          isFirst={index === 0}
                          isLast={index === todaysPlaylist.length - 1}
                          checked={checkedIds.has(aff.id)}
                          onToggleCheck={toggleChecked}
                          playingId={playingId}
                          onTogglePlay={setPlayingId}
                        />
                      ))}
                    </View>
                  </View>
                ) : !isLoading ? (
                  <View style={styles.ftueSection}>
                    <Text style={styles.ftueWelcome}>
                      Record your first affirmations to get started.
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.ftueSlider}
                    >
                      {ftueScripts.map((s, index) => (
                        <View key={`${s.title}-${index}`} style={[styles.ftueCard, { width: vw * 0.66 }]}>
                          <Pressable
                            style={styles.ftueShuffleBtn}
                            onPress={() => shuffleFtueScript(index)}
                            hitSlop={8}
                          >
                            <Ionicons name="shuffle-outline" size={20} color={COLORS.textSecondary} />
                          </Pressable>
                          <Text style={styles.ftueCardTitle}>{s.title}</Text>
                          <Text style={styles.ftueCardScript} numberOfLines={4}>
                            {s.script}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}

            {/* CTA Button — always visible */}
            <View style={styles.ctaArea}>
              {hasRecordedAffirmations ? (
                <Button
                  label="Start Affirmation"
                  onPress={() => {
                    setPlayingId(null);
                    router.push({
                      pathname: '/(main)/listen',
                      params: { playlistIds: todaysPlaylist.filter(a => checkedIds.has(a.id)).map(a => a.id).join(',') },
                    });
                  }}
                />
              ) : (
                <Button
                  label="Start Recording"
                  onPress={handleFtueStartRecording}
                />
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* Intro typewriter overlay */}
      {introPhase === 'typing' || introPhase === 'settling' ? (
        <>
          {/* Background — blocks content during typing, fades during slide */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: COLORS.background,
                opacity: introBgOpacity,
                zIndex: 100,
              },
            ]}
            pointerEvents={introPhase === 'typing' ? 'box-only' : 'none'}
          />
          {/* Text — stays solid, slides up to hero position, then swapped out */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                justifyContent: 'center',
                zIndex: 101,
                transform: [{ translateY: introTextY }],
              },
            ]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.heroText,
                {
                  fontSize: vw * 0.24,
                  lineHeight: vw * 0.24 * 0.8,
                  letterSpacing: vw * -0.005,
                  paddingHorizontal: vw * 0.07,
                  paddingTop: 0,
                },
              ]}
            >
              {introPhase === 'typing'
                ? heroText.substring(0, introTypedLength)
                : heroText}
            </Text>
          </Animated.View>
        </>
      ) : null}

      {/* Celebration modal — shown after completing a doodle */}
      <Modal
        visible={celebrationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebrationVisible(false)}
      >
        <View style={styles.celebrationOverlay}>
          <Confetti active={celebrationVisible} />
          <View style={styles.celebrationCard} onStartShouldSetResponder={() => true}>
            {/* Handle bar */}
            <View style={styles.celebrationHandle} />

            {/* Doodle Preview */}
            <View style={styles.celebrationDoodleWrapper}>
              {todayDoodle && (
                <DoodleThumbnail
                  doodleData={todayDoodle}
                  width={Math.min(vw * 0.5, 200)}
                  height={Math.min(vw * 0.5 * 1.5, 300)}
                  inverted
                  borderRadius={16}
                />
              )}
            </View>

            {/* Title and date */}
            <Text style={styles.celebrationTitle}>
              {completedTitle || todaySession?.affirmations?.title || "Today's Affirmation"}
            </Text>
            <Text style={styles.celebrationDate}>Today</Text>

            {/* Divider */}
            <View style={styles.celebrationDivider} />

            {/* Record another CTA */}
            {sessions.filter((s) => s.doodle_data).length <= 1 && (
              <Text style={styles.celebrationPrompt}>
                Come back tomorrow for your first affirmation listen.
              </Text>
            )}
            <Text style={styles.celebrationPrompt}>Keep expanding your library!</Text>
            <Pressable
              style={styles.celebrationButton}
              onPress={() => {
                setCelebrationVisible(false);
                router.push('/(main)/create');
              }}
            >
              <Text style={styles.celebrationButtonLabel}>Record another</Text>
            </Pressable>

            {/* Close */}
            <Pressable
              style={styles.celebrationClose}
              onPress={() => setCelebrationVisible(false)}
            >
              <Text style={styles.celebrationCloseLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Past doodle view modal */}
      <Modal
        visible={!!viewSession}
        transparent
        animationType="fade"
        onRequestClose={() => setViewSession(null)}
      >
        <Pressable
          style={styles.viewOverlay}
          onPress={() => setViewSession(null)}
        >
          <View style={styles.viewCard} onStartShouldSetResponder={() => true}>
            {/* 3-dot menu */}
            <Pressable
              style={styles.viewMenuButton}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.text} />
            </Pressable>

            {/* Doodle preview */}
            <View style={styles.viewDoodleWrapper}>
              {viewDoodle && (
                <DoodleThumbnail
                  doodleData={viewDoodle}
                  width={vw * 0.55}
                  height={vw * 0.55 * 1.5}
                  inverted
                  borderRadius={16}
                />
              )}
            </View>

            {/* Info */}
            <Text style={styles.viewTitle}>
              {viewSession?.affirmations?.title ?? 'Affirmation'}
            </Text>
            <Text
              style={[styles.viewDate, { cursor: 'context-menu' } as any]}
              onLongPress={() => viewSession && handleDebugChangeDate(viewSession)}
              {...(Platform.OS === 'web' ? {
                onContextMenu: (e: any) => {
                  e.preventDefault();
                  if (viewSession) handleDebugChangeDate(viewSession);
                },
              } : {})}
            >
              {viewSession ? formatDateLabel(viewSession.listened_at) : ''}
            </Text>
          </View>
        </Pressable>

        {/* Nested action menu */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setMenuOpen(false)}
          >
            <View style={styles.menuCard}>
              <Pressable style={styles.menuItem} onPress={handleViewRedoDoodle}>
                <Ionicons name="refresh" size={18} color={COLORS.text} />
                <Text style={styles.menuItemText}>Redo Doodle</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={handleViewLogAgain}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.text} />
                <Text style={styles.menuItemText}>Log Again</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable style={styles.menuItem} onPress={handleViewDeleteEntry}>
                <Ionicons name="trash-outline" size={18} color="#D14" />
                <Text style={[styles.menuItemText, { color: '#D14' }]}>Delete Entry</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  settingsText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  heroText: {
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.text,
    paddingTop: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
  },
  manageLink: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.6,
    textDecorationLine: 'underline',
  },
  gridContainer: {
    position: 'relative',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  gridCell: {
    backgroundColor: '#E8E2DB',
    borderWidth: 2,
    borderColor: '#E8E2DB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridCellFilled: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
    borderWidth: 0,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAFC',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  handle: {
    width: 24,
    height: 4,
    borderRadius: 45,
    backgroundColor: COLORS.text,
    opacity: 0.1,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 32,
  },
  playlistSection: {
    gap: 16,
    paddingBottom: 16,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  timelineProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  timelineCheckbox: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCheckboxBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCheckboxChecked: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  timelineMarkerCol: {
    alignItems: 'center',
    width: 24,
  },
  timelinePlayDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineVertLine: {
    width: 2,
    height: 8,
    backgroundColor: COLORS.text,
    opacity: 0.15,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 1,
    paddingBottom: 4,
  },
  timelineTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 17,
  },
  timelineTitleUnchecked: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  timelineDuration: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },

  // Manage mode
  manageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingBottom: 12,
  },
  manageHeaderTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
  },
  manageCountBadge: {
    backgroundColor: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  manageCountText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: COLORS.white,
  },
  manageScrollView: {
    flex: 1,
  },
  manageListContent: {
    paddingHorizontal: 24,
  },
  manageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  manageProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  managePlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageInfo: {
    flex: 1,
    gap: 2,
  },
  manageItemTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
  },
  manageItemMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  manageKebab: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageChevron: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageInlineMenu: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 4,
  },
  manageInlineMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  manageInlineMenuText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.text,
  },
  manageScript: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  manageBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FAFAFC',
  },
  manageBackBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBackArrow: {
    fontSize: 18,
    color: COLORS.text,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // FTUE sheet content
  ftueSection: {
    gap: 16,
    paddingBottom: 8,
    marginHorizontal: -32,
  },
  ftueWelcome: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  ftueSlider: {
    paddingHorizontal: 24,
    gap: 12,
  },
  ftueCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
    gap: 8,
  },
  ftueShuffleBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ftueCardTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    paddingRight: 36,
  },
  ftueCardScript: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  ctaArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FAFAFC',
  },

  // Completion state
  doodlePreviewWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  completionInfo: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 32,
  },
  completionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    textDecorationLine: 'underline',
  },
  completionDate: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  collapsedComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 12,
  },
  collapsedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },

  // Share button
  shareButton: {
    height: 63,
    borderRadius: 32,
    backgroundColor: COLORS.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },

  // 3-dot menu
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 220,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.text,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 20,
  },

  // Celebration modal
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '85%',
  },
  celebrationHandle: {
    width: 32,
    height: 4,
    borderRadius: 45,
    backgroundColor: COLORS.text,
    opacity: 0.12,
    marginBottom: 24,
  },
  celebrationDoodleWrapper: {
    marginBottom: 20,
  },
  celebrationTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.text,
    textDecorationLine: 'underline',
    textAlign: 'center',
    marginBottom: 4,
  },
  celebrationDate: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  celebrationDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  celebrationPrompt: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  celebrationButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  celebrationButtonLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: COLORS.white,
  },
  celebrationClose: {
    paddingVertical: 8,
  },
  celebrationCloseLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: COLORS.text,
    textDecorationLine: 'underline',
  },

  // Past doodle view modal
  viewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewCard: {
    backgroundColor: '#FAFAFC',
    borderRadius: 20,
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '80%',
  },
  viewMenuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewDoodleWrapper: {
    marginBottom: 16,
  },
  viewTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  viewDate: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
