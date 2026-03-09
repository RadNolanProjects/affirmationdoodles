import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useAffirmations } from '@/hooks/useAffirmations';
import { useListeningSession } from '@/hooks/useListeningSession';
import { COLORS, FONTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { AffirmationCard } from '@/components/affirmation/AffirmationCard';
import { DoodleThumbnail } from '@/components/doodle/DoodleThumbnail';
import type { DoodleData, ListeningSession } from '@/types';

type SessionWithTitle = ListeningSession & {
  affirmations: { title: string } | null;
};

const SHEET_COLLAPSED = 130;
const SHEET_COLLAPSED_COMPLETE = 80;
const SHEET_EXPANDED_DEFAULT = 340;
const SHEET_EXPANDED_COMPLETE = 500;
const SNAP_THRESHOLD = 60;
const EMPTY_TRAIL_CELLS = 140;

function parseDoodleData(raw: string | null): DoodleData | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoodleData;
  } catch {
    return null;
  }
}

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { width: vw } = useWindowDimensions();
  const { affirmations, isLoading, fetchAffirmations } = useAffirmations();
  const { getAllSessions, deleteSession, createSession } = useListeningSession();
  const [sessions, setSessions] = useState<SessionWithTitle[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewSession, setViewSession] = useState<SessionWithTitle | null>(null);

  // Sheet state — use refs so panResponder closures read current values
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const expandedRef = useRef(SHEET_EXPANDED_DEFAULT);
  const completedRef = useRef(false);
  const sheetHeight = useRef(new Animated.Value(SHEET_EXPANDED_DEFAULT)).current;
  const lastHeight = useRef(SHEET_EXPANDED_DEFAULT);

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

  // Keep refs in sync for panResponder closures
  useEffect(() => {
    const newExpanded = todayCompleted ? SHEET_EXPANDED_COMPLETE : SHEET_EXPANDED_DEFAULT;
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
  }, [todayCompleted]);

  // All completed sessions, newest first (allows multiple per day)
  const uniqueSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => s.doodle_data)
      .sort((a, b) => b.listened_at.localeCompare(a.listened_at));
  }, [sessions]);

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

  // Today's affirmation (pick first active one, or random)
  const todaysAffirmation = useMemo(() => {
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)];
  }, [affirmations]);

  const hasAffirmations = affirmations.length > 0;
  const hasRecordedAffirmations = affirmations.some((a) => a.audio_url);

  const cellWidth = vw * 0.05;
  const cellHeight = cellWidth * 1.5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Scrollable content behind the sheet */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: vw * 0.07 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Text */}
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

        {/* History Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>History</Text>
          <View style={styles.gridContainer}>
            <View style={[styles.grid, { gap: vw * 0.01, marginTop: 16 }]}>
              {uniqueSessions.map((session) => {
                const doodle = parseDoodleData(session.doodle_data);

                const cellContent = (
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
                );

                if (doodle) {
                  return (
                    <Pressable key={session.id} onPress={() => setViewSession(session)}>
                      {cellContent}
                    </Pressable>
                  );
                }
                return <View key={session.id}>{cellContent}</View>;
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
        </View>

        {/* Extra space so content isn't hidden behind sheet */}
        <Animated.View style={{ height: Animated.add(sheetHeight, 20) }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Drag Handle */}
        <View {...panResponder.panHandlers}>
          <Pressable style={styles.handleArea} onPress={toggleSheet}>
            <View style={styles.handle} />
          </Pressable>
        </View>

        {todayCompleted ? (
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

            {/* Share button — only when expanded */}
            {sheetExpanded && (
              <View style={styles.ctaArea}>
                <Pressable
                  style={styles.shareButton}
                  onPress={() => {
                    // Share functionality — future M5
                  }}
                >
                  <Ionicons name="share-outline" size={18} color={COLORS.white} />
                  <Text style={styles.shareLabel}>Share</Text>
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
                {todaysAffirmation ? (
                  <View style={styles.affirmationSection}>
                    <View style={styles.affirmationHeader}>
                      <Text style={styles.sectionLabel}>Today's Affirmation</Text>
                      <Pressable onPress={() => router.push('/(main)/manage')}>
                        <Text style={styles.manageLink}>Manage</Text>
                      </Pressable>
                    </View>
                    <AffirmationCard affirmation={todaysAffirmation} />
                  </View>
                ) : !isLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      Record your first affirmation to get started.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* CTA Button — always visible */}
            <View style={styles.ctaArea}>
              {hasRecordedAffirmations ? (
                <Button
                  label="Start Affirmation"
                  onPress={() => router.push('/(main)/listen')}
                />
              ) : (
                <Button
                  label={hasAffirmations ? 'Record Affirmation' : '+ Create Affirmation'}
                  onPress={() => router.push('/(main)/create')}
                />
              )}
            </View>
          </>
        )}
      </Animated.View>

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
            <Text style={styles.viewDate}>
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
  heroText: {
    fontFamily: FONTS.displaySemiBold,
    color: COLORS.text,
    paddingTop: 40,
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
  affirmationSection: {
    gap: 16,
    paddingBottom: 32,
  },
  affirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
