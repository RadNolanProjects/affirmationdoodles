import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { useAuth } from '@/contexts/AuthContext';
import { useAffirmations } from '@/hooks/useAffirmations';
import { useListeningSession } from '@/hooks/useListeningSession';
import { COLORS, FONTS } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import { AffirmationCard } from '@/components/affirmation/AffirmationCard';

const SHEET_COLLAPSED = 130; // handle + CTA + bottom padding
const SHEET_EXPANDED = 420; // handle + affirmation section + CTA + padding
const SNAP_THRESHOLD = 60;

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const { width: vw, height: vh } = useWindowDimensions();
  const { affirmations, isLoading, fetchAffirmations } = useAffirmations();
  const { getSessionsForMonth } = useListeningSession();
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  // Sheet state
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const sheetHeight = useRef(new Animated.Value(SHEET_EXPANDED)).current;
  const lastHeight = useRef(SHEET_EXPANDED);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        const newHeight = Math.max(
          SHEET_COLLAPSED,
          Math.min(SHEET_EXPANDED, lastHeight.current - gesture.dy)
        );
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        const currentHeight = lastHeight.current - gesture.dy;
        const shouldExpand = gesture.dy < -SNAP_THRESHOLD ||
          (currentHeight > (SHEET_COLLAPSED + SHEET_EXPANDED) / 2 && gesture.dy <= SNAP_THRESHOLD);

        const target = shouldExpand ? SHEET_EXPANDED : SHEET_COLLAPSED;
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
    const target = sheetExpanded ? SHEET_COLLAPSED : SHEET_EXPANDED;
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
      const now = new Date();
      const sessions = await getSessionsForMonth(
        now.getFullYear(),
        now.getMonth() + 1
      );
      const days = new Set(sessions.map((s) => s.listened_at));
      setCompletedDays(days);
    } catch {}
  };

  const heroText = 'I am more\nthan enough';

  // Today's affirmation (pick first active one, or random)
  const todaysAffirmation = useMemo(() => {
    const active = affirmations.filter((a) => a.is_active && a.audio_url);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)];
  }, [affirmations]);

  // Generate history grid for current month
  const historyGrid = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const cells: { day: number | null; completed: boolean }[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, completed: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, completed: completedDays.has(dateStr) });
    }
    return cells;
  }, [completedDays]);

  const hasAffirmations = affirmations.length > 0;
  const hasRecordedAffirmations = affirmations.some((a) => a.audio_url);

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
          <View style={[styles.grid, { gap: vw * 0.01, marginTop: 16 }]}>
            {historyGrid.map((cell, i) => {
              const isFirstDay = cell.day === 1;
              return (
                <View
                  key={i}
                  style={[
                    {
                      width: vw * 0.05,
                      height: vw * 0.05 * 1.5,
                      borderRadius: vw * 0.01,
                    },
                    styles.gridCell,
                    cell.day === null && styles.gridCellEmpty,
                    isFirstDay && styles.gridCellFirst,
                    cell.completed && styles.gridCellFilled,
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Extra space so content isn't hidden behind sheet */}
        <View style={{ height: SHEET_EXPANDED + 20 }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Drag Handle */}
        <View {...panResponder.panHandlers}>
          <Pressable style={styles.handleArea} onPress={toggleSheet}>
            <View style={styles.handle} />
          </Pressable>
        </View>

        {/* Expandable content */}
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
      </Animated.View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    backgroundColor: '#E8E2DB',
    borderWidth: 2,
    borderColor: '#E8E2DB',
  },
  gridCellEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  gridCellFirst: {
    borderColor: COLORS.text,
  },
  gridCellFilled: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
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
  },
});
