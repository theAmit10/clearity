import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  LayoutChangeEvent,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { useHabitStore, computeEffectiveDateSet } from '../store/habitStore';
import { Raised, Inset } from './neumorphic/NeumorphicView';
import CalendarIcon from './CalendarIcon';
import { NeumorphicButton } from './neumorphic/NeumorphicButton';
import { useTheme } from '../theme/ThemeProvider';
import Svg, { Path } from 'react-native-svg';

interface Props {
  habitId: string;
  /** Accent used for the completed-day fill/dot. Defaults to the
   * neumorphic theme's fallback coral so this still looks right if a
   * caller doesn't pass the habit's own color. */
  color?: string;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

interface MonthPage {
  key: string;
  year: number;
  month: number;
}

function generateMonths(
  centerYear: number,
  centerMonth: number,
  range: number,
): MonthPage[] {
  const pages: MonthPage[] = [];
  const totalMonths = centerYear * 12 + centerMonth;
  for (let i = -range; i <= range; i++) {
    const m = totalMonths + i;
    const y = Math.floor(m / 12);
    const mo = m % 12;
    pages.push({ key: `${y}-${mo}`, year: y, month: mo });
  }
  return pages;
}

export default function MonthlyCalendar({
  habitId,
  color: colorProp,
}: Props) {
  const { theme } = useTheme();
  const { colors, radii } = theme;
  const color = colorProp ?? colors.accent;
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const addMissedNote = useHabitStore(s => s.addMissedNote);
  const removeMissedNote = useHabitStore(s => s.removeMissedNote);
  const habit = useHabitStore(s => s.habits.find(h => h.id === habitId));
  const completions = habit?.completions ?? {};
  const missedNotes = habit?.missedNotes ?? {};

  const [missedModal, setMissedModal] = useState<{ dateKey: string } | null>(null);
  const [missedNoteText, setMissedNoteText] = useState('');

  const effectiveSet = useMemo(() => {
    if (!habit || !habit.frequency || habit.frequency === 'daily') return null;
    return computeEffectiveDateSet(habit);
  }, [completions, habit?.frequency, habit?.frequencyValue, habit?.frequencyWindow]);

  const today = new Date();
  const todayStr = toDateKey(today);
  const centerIndex = 24;

  const months = useMemo(
    () => generateMonths(today.getFullYear(), today.getMonth(), 24),
    [],
  );

  const flatRef = useRef<FlatList>(null);
  // Start at 0 (not a guessed screen-width value) and only render the
  // FlatList once a real onLayout measurement comes in. Rendering with a
  // guessed width and then swapping it out after mount was causing
  // initialScrollIndex to jump to the wrong page/offset — which is what
  // made a given month look cut off or blank.
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleMonth, setVisibleMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const cellSize = containerWidth / 7;
  const circleSize = cellSize - 4;

  const CS = useMemo(
    () => ({
      weekdayText: {
        width: cellSize,
        textAlign: 'center' as const,
        fontSize: 12,
        fontWeight: '700' as const,
        color: colors.textMuted,
      },
      spacer: { width: cellSize, height: cellSize },
      wrapper: {
        width: cellSize,
        height: cellSize,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        position: 'relative' as const,
      },
      hitArea: {
        width: cellSize,
        height: cellSize,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      circle: {
        width: circleSize,
        height: circleSize,
        borderRadius: circleSize / 2,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
    }),
    [cellSize, circleSize, colors, radii],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    // Ignore no-op / rounding-jitter re-measures so we don't thrash the
    // FlatList's item layout mid-scroll.
    setContainerWidth(prev => (Math.abs(prev - width) > 0.5 ? width : prev));
  }, []);

  const onMomentumEnd = useCallback(
    (e: any) => {
      const offset = e.nativeEvent.contentOffset.x;
      const index = Math.round(offset / containerWidth);
      const page = months[index];
      if (page) setVisibleMonth({ year: page.year, month: page.month });
    },
    [containerWidth, months],
  );

  const handleLongPress = useCallback(
    (dateKey: string) => {
      if (missedNotes[dateKey]) {
        setMissedNoteText(missedNotes[dateKey]);
      } else {
        setMissedNoteText('');
      }
      setMissedModal({ dateKey });
    },
    [missedNotes],
  );

  const renderMonth = useCallback(
    ({ item }: { item: MonthPage }) => {
      const days = getMonthDays(item.year, item.month);
      return (
        <View style={{ width: containerWidth }}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={CS.weekdayText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, i) => {
              if (day === null) {
                return <View key={`e-${i}`} style={CS.spacer} />;
              }
              const date = new Date(item.year, item.month, day);
              const dateKey = toDateKey(date);
              const isToday = dateKey === todayStr;
              const isFutureDay = isFuture(date);
              const isCompleted = effectiveSet ? effectiveSet.has(dateKey) : !!completions[dateKey];
              const hasPartial = !!completions[dateKey];
              const hasMissedNote = !!missedNotes[dateKey];
              const isMissed = !isFutureDay && !isCompleted && !isToday && !hasPartial;
              const isMulti = habit?.frequency === 'n_times_in_m_days';
              const multiCount = completions[dateKey] || 0;
              const multiTarget = habit?.frequencyValue ?? 1;

              if (isFutureDay) {
                return (
                  <View key={dateKey} style={CS.wrapper}>
                    <View style={CS.hitArea}>
                      <View style={[CS.circle, styles.futureCircle]}>
                        <Text style={[styles.dayText, styles.futureText, { color: colors.textMuted }]}>
                          {day}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }

              return (
                <View key={dateKey} style={CS.wrapper}>
                  <NeumorphicButton
                    onPress={() => toggleCompletion(habitId, dateKey)}
                    onLongPress={() => handleLongPress(dateKey)}
                    delayLongPress={400}
                    forcePressed={isCompleted}
                    radius={circleSize / 2}
                    distance={4}
                    style={[
                      CS.circle,
                      isCompleted && { backgroundColor: `${color}26` },
                      isToday && [styles.todayRing, { borderColor: colors.textPrimary }],
                    ]}
                  >
                    {isMulti && !isCompleted && multiTarget > 0 && (
                      <View style={{ position: 'absolute', top: 0, left: 0, width: circleSize, height: circleSize }}>
                        <Svg width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`}>
                          {Array.from({ length: multiTarget }, (_, i) => {
                            const cx = circleSize / 2;
                            const cy = circleSize / 2;
                            const strokeW = 3;
                            const r = (circleSize - strokeW - 4) / 2;
                            const angleStep = (2 * Math.PI) / multiTarget;
                            const gapAngle = 0.15;
                            const segAngle = angleStep - gapAngle;
                            const a1 = i * angleStep - Math.PI / 2 + gapAngle / 2;
                            const a2 = a1 + segAngle;
                            const x1 = cx + r * Math.cos(a1);
                            const y1 = cy + r * Math.sin(a1);
                            const x2 = cx + r * Math.cos(a2);
                            const y2 = cy + r * Math.sin(a2);
                            const largeArc = segAngle > Math.PI ? 1 : 0;
                            const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
                            const filled = i < multiCount;
                            return (
                              <Path
                                key={i}
                                d={d}
                                stroke={filled ? color : `${color}26`}
                                strokeWidth={strokeW}
                                strokeLinecap="butt"
                                fill="none"
                              />
                            );
                          })}
                        </Svg>
                      </View>
                    )}
                    <Text style={[styles.dayText, { color: colors.textPrimary }, isCompleted && { color }]}>
                      {day}
                    </Text>
                    {isMulti && (
                      <>
                        {hasMissedNote && (
                          <View style={[styles.missedNoteDot, { backgroundColor: color }]} />
                        )}
                        {isCompleted && !hasMissedNote && (
                          <Text style={{ position: 'absolute', bottom: 4, fontSize: 8, color, fontWeight: '800' }}>
                            ✓
                          </Text>
                        )}
                      </>
                    )}
                  </NeumorphicButton>
                  {isMulti ? null : (
                    <>
                      {!isCompleted && isMissed && <View style={styles.missedDot} />}
                      {hasMissedNote && (
                        <View style={[styles.missedNoteDot, { backgroundColor: color }]} />
                      )}
                      {isCompleted && !hasMissedNote && (
                        <View style={[styles.doneDot, { backgroundColor: color }]} />
                      )}
                      {!isCompleted && hasPartial && (
                        <View style={[styles.partialDot, { backgroundColor: color }]} />
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      );
    },
    [
      containerWidth,
      CS,
      effectiveSet,
      completions,
      missedNotes,
      habitId,
      toggleCompletion,
      handleLongPress,
      todayStr,
      color,
      circleSize,
    ],
  );

  const monthLabel = `${MONTHS[visibleMonth.month]} ${visibleMonth.year}`;

  // Once we know the real width, snap straight to the current month with
  // no animation — this replaces relying on `initialScrollIndex` against
  // a width that wasn't measured yet.
  useEffect(() => {
    if (containerWidth > 0) {
      flatRef.current?.scrollToIndex({ index: centerIndex, animated: false });
    }
  }, [containerWidth > 0]);

  return (
    <Raised radius={radii.panel} distance={7} style={styles.card}>
      <View onLayout={onLayout} style={styles.calendarBody}>
        {containerWidth > 0 && (
          <FlatList
            ref={flatRef}
            data={months}
            keyExtractor={item => item.key}
            renderItem={renderMonth}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={centerIndex}
            getItemLayout={(_, index) => ({
              length: containerWidth,
              offset: containerWidth * index,
              index,
            })}
            onMomentumScrollEnd={onMomentumEnd}
            removeClippedSubviews
            windowSize={3}
          />
        )}

        <View style={styles.bottomNav}>
          <Raised
            radius={radii.pill}
            distance={5}
            style={styles.monthPicker}
          >
            <Pressable style={styles.monthPickerHit}>
              <View style={styles.monthPickerRow}>
                <CalendarIcon size={14} />
                <Text style={[styles.monthPickerText, { color: colors.textPrimary }]}>{monthLabel}</Text>
              </View>
            </Pressable>
          </Raised>
          <View style={styles.navButtons}>
            <NeumorphicButton
              radius={radii.iconBtn}
              distance={5}
              style={styles.navButton}
              onPress={() => {
                const idx = months.findIndex(
                  m =>
                    m.year === visibleMonth.year &&
                    m.month === visibleMonth.month,
                );
                if (idx > 0)
                  flatRef.current?.scrollToIndex({
                    index: idx - 1,
                    animated: true,
                  });
              }}
            >
              <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>‹</Text>
            </NeumorphicButton>
            <NeumorphicButton
              radius={radii.iconBtn}
              distance={5}
              style={styles.navButton}
              onPress={() => {
                const idx = months.findIndex(
                  m =>
                    m.year === visibleMonth.year &&
                    m.month === visibleMonth.month,
                );
                if (idx < months.length - 1)
                  flatRef.current?.scrollToIndex({
                    index: idx + 1,
                    animated: true,
                  });
              }}
            >
              <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>›</Text>
            </NeumorphicButton>
          </View>
        </View>
      </View>

      <Modal
        visible={!!missedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setMissedModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setMissedModal(null)}>
            <Pressable onPress={() => {}}>
              <Raised radius={16} distance={8} style={styles.modalCard}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {missedNotes[missedModal?.dateKey ?? ''] ? 'Edit missed note' : 'Mark as missed'}
                </Text>
                <Text style={[styles.modalDate, { color: colors.textMuted }]}>
                  {missedModal?.dateKey}
                </Text>
                <Inset radius={10} style={styles.modalInset}>
                  <TextInput
                    style={[styles.modalInput, { color: colors.textPrimary }]}
                    value={missedNoteText}
                    onChangeText={setMissedNoteText}
                    placeholder="Explain why you missed it…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    autoFocus
                  />
                </Inset>
                <View style={styles.modalActions}>
                  {missedNotes[missedModal?.dateKey ?? ''] && (
                    <NeumorphicButton
                      radius={12}
                      distance={4}
                      style={styles.modalDeleteBtn}
                      onPress={() => {
                        if (missedModal) {
                          removeMissedNote(habitId, missedModal.dateKey);
                          setMissedModal(null);
                        }
                      }}
                    >
                      <Text style={[styles.modalDeleteText, { color: '#FF3B30' }]}>Remove</Text>
                    </NeumorphicButton>
                  )}
                  <NeumorphicButton
                    radius={12}
                    distance={4}
                    style={[styles.modalCancelBtn]}
                    onPress={() => setMissedModal(null)}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
                  </NeumorphicButton>
                  <NeumorphicButton
                    radius={12}
                    distance={4}
                    backgroundColor={color}
                    onPress={() => {
                      if (missedModal && missedNoteText.trim()) {
                        addMissedNote(habitId, missedModal.dateKey, missedNoteText.trim());
                        setMissedModal(null);
                      } else if (missedModal && !missedNoteText.trim()) {
                        Alert.alert('Please enter an explanation');
                      }
                    }}
                  >
                    <Text style={[styles.modalSaveText, { color: '#FFFFFF' }]}>Save</Text>
                  </NeumorphicButton>
                </View>
              </Raised>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Raised>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  calendarBody: {
    width: '100%',
    minHeight: 300,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '700',
  },
  futureCircle: {
    backgroundColor: 'transparent',
  },
  futureText: {
    opacity: 0.5,
  },
  todayRing: {
    borderWidth: 2,
  },
  missedDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2726B',
  },
  doneDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  partialDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 1,
    opacity: 0.4,
  },
  missedNoteDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalCard: {
    width: 300,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 14,
  },
  modalInset: {
    marginBottom: 14,
    padding: 4,
  },
  modalInput: {
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalDeleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
  },
  monthPicker: {
    overflow: 'hidden',
  },
  monthPickerHit: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthPickerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

// import React, { useRef, useState, useMemo, useCallback } from 'react';
// import {
//   View,
//   Text,
//   Pressable,
//   StyleSheet,
//   FlatList,
//   LayoutChangeEvent,
//   Dimensions,
// } from 'react-native';
// import { toDateKey, isFuture } from '../services/dateUtils';
// import { useHabitStore } from '../store/habitStore';
// import { Raised } from './neumorphic/NeumorphicView';
// import { NeumorphicButton } from './neumorphic/NeumorphicButton';
// import { neumorphic } from '../theme/neumorphicTheme';

// const CARD_H_PADDING = 28; // 14 + 14

// interface Props {
//   habitId: string;
//   /** Accent used for the completed-day fill/dot. Defaults to the
//    * neumorphic theme's fallback coral so this still looks right if a
//    * caller doesn't pass the habit's own color. */
//   color?: string;
// }

// const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// const MONTHS = [
//   'January',
//   'February',
//   'March',
//   'April',
//   'May',
//   'June',
//   'July',
//   'August',
//   'September',
//   'October',
//   'November',
//   'December',
// ];

// function getMonthDays(year: number, month: number): (number | null)[] {
//   const firstDay = new Date(year, month, 1).getDay();
//   const daysInMonth = new Date(year, month + 1, 0).getDate();
//   const cells: (number | null)[] = [];
//   for (let i = 0; i < firstDay; i++) cells.push(null);
//   for (let d = 1; d <= daysInMonth; d++) cells.push(d);
//   return cells;
// }

// interface MonthPage {
//   key: string;
//   year: number;
//   month: number;
// }

// function generateMonths(
//   centerYear: number,
//   centerMonth: number,
//   range: number,
// ): MonthPage[] {
//   const pages: MonthPage[] = [];
//   const totalMonths = centerYear * 12 + centerMonth;
//   for (let i = -range; i <= range; i++) {
//     const m = totalMonths + i;
//     const y = Math.floor(m / 12);
//     const mo = m % 12;
//     pages.push({ key: `${y}-${mo}`, year: y, month: mo });
//   }
//   return pages;
// }

// export default function MonthlyCalendar({
//   habitId,
//   color = neumorphic.colors.accentFallback,
// }: Props) {
//   const toggleCompletion = useHabitStore(s => s.toggleCompletion);
//   const completions = useHabitStore(s => {
//     const h = s.habits.find(h => h.id === habitId);
//     return h?.completions ?? {};
//   });

//   const today = new Date();
//   const todayStr = toDateKey(today);
//   const centerIndex = 24;

//   const months = useMemo(
//     () => generateMonths(today.getFullYear(), today.getMonth(), 24),
//     [],
//   );

//   const flatRef = useRef<FlatList>(null);
//   const [containerWidth, setContainerWidth] = useState(
//     Dimensions.get('window').width - 100,
//   );
//   const [visibleMonth, setVisibleMonth] = useState(() => ({
//     year: today.getFullYear(),
//     month: today.getMonth(),
//   }));
//   const cellSize = containerWidth / 7;
//   const circleSize = cellSize - 4;

//   const CS = useMemo(
//     () => ({
//       weekdayText: {
//         width: cellSize,
//         textAlign: 'center' as const,
//         fontSize: 12,
//         fontWeight: '700' as const,
//         color: neumorphic.colors.textMuted,
//       },
//       spacer: { width: cellSize, height: cellSize },
//       wrapper: {
//         width: cellSize,
//         height: cellSize,
//         alignItems: 'center' as const,
//         justifyContent: 'center' as const,
//         position: 'relative' as const,
//       },
//       hitArea: {
//         width: cellSize,
//         height: cellSize,
//         alignItems: 'center' as const,
//         justifyContent: 'center' as const,
//       },
//       circle: {
//         width: circleSize,
//         height: circleSize,
//         borderRadius: circleSize / 2,
//         alignItems: 'center' as const,
//         justifyContent: 'center' as const,
//       },
//     }),
//     [cellSize, circleSize],
//   );

//   const onLayout = useCallback((e: LayoutChangeEvent) => {
//     setContainerWidth(e.nativeEvent.layout.width - CARD_H_PADDING);
//   }, []);

//   const onMomentumEnd = useCallback(
//     (e: any) => {
//       const offset = e.nativeEvent.contentOffset.x;
//       const index = Math.round(offset / containerWidth);
//       const page = months[index];
//       if (page) setVisibleMonth({ year: page.year, month: page.month });
//     },
//     [containerWidth, months],
//   );

//   const renderMonth = useCallback(
//     ({ item }: { item: MonthPage }) => {
//       const days = getMonthDays(item.year, item.month);
//       return (
//         <View style={{ width: containerWidth }}>
//           <View style={styles.weekdayRow}>
//             {WEEKDAYS.map((d, i) => (
//               <Text key={i} style={CS.weekdayText}>
//                 {d}
//               </Text>
//             ))}
//           </View>

//           <View style={styles.daysGrid}>
//             {days.map((day, i) => {
//               if (day === null) {
//                 return <View key={`e-${i}`} style={CS.spacer} />;
//               }
//               const date = new Date(item.year, item.month, day);
//               const dateKey = toDateKey(date);
//               const isToday = dateKey === todayStr;
//               const isFutureDay = isFuture(date);
//               const isCompleted = !!completions[dateKey];
//               const isMissed = !isFutureDay && !isCompleted && !isToday;

//               // Future days aren't interactive yet, so they stay flush
//               // with the page instead of looking pressable.
//               if (isFutureDay) {
//                 return (
//                   <View key={dateKey} style={CS.wrapper}>
//                     <View style={CS.hitArea}>
//                       <View style={[CS.circle, styles.futureCircle]}>
//                         <Text style={[styles.dayText, styles.futureText]}>
//                           {day}
//                         </Text>
//                       </View>
//                     </View>
//                   </View>
//                 );
//               }

//               return (
//                 <View key={dateKey} style={CS.wrapper}>
//                   <NeumorphicButton
//                     onPress={() => toggleCompletion(habitId, dateKey)}
//                     forcePressed={isCompleted}
//                     radius={circleSize / 2}
//                     distance={4}
//                     style={[
//                       CS.circle,
//                       isCompleted && { backgroundColor: `${color}26` },
//                       isToday && styles.todayRing,
//                     ]}
//                   >
//                     <Text style={[styles.dayText, isCompleted && { color }]}>
//                       {day}
//                     </Text>
//                   </NeumorphicButton>
//                   {isMissed && <View style={styles.missedDot} />}
//                   {isCompleted && (
//                     <View
//                       style={[styles.doneDot, { backgroundColor: color }]}
//                     />
//                   )}
//                 </View>
//               );
//             })}
//           </View>
//         </View>
//       );
//     },
//     [
//       containerWidth,
//       CS,
//       completions,
//       habitId,
//       toggleCompletion,
//       todayStr,
//       color,
//       circleSize,
//     ],
//   );

//   const monthLabel = `${MONTHS[visibleMonth.month]} ${visibleMonth.year}`;

//   return (
//     <Raised radius={neumorphic.radii.panel} distance={7} style={styles.card}>
//       <View onLayout={onLayout}>
//         <FlatList
//           ref={flatRef}
//           data={months}
//           keyExtractor={item => item.key}
//           renderItem={renderMonth}
//           horizontal
//           pagingEnabled
//           showsHorizontalScrollIndicator={false}
//           initialScrollIndex={centerIndex}
//           getItemLayout={(_, index) => ({
//             length: containerWidth,
//             offset: containerWidth * index,
//             index,
//           })}
//           onMomentumScrollEnd={onMomentumEnd}
//           removeClippedSubviews
//           windowSize={3}
//         />

//         <View style={styles.bottomNav}>
//           <Raised
//             radius={neumorphic.radii.pill}
//             distance={5}
//             style={styles.monthPicker}
//           >
//             <Pressable style={styles.monthPickerHit}>
//               <Text style={styles.monthPickerText}>📅 {monthLabel}</Text>
//             </Pressable>
//           </Raised>
//           <View style={styles.navButtons}>
//             <NeumorphicButton
//               radius={neumorphic.radii.iconBtn}
//               distance={5}
//               style={styles.navButton}
//               onPress={() => {
//                 const idx = months.findIndex(
//                   m =>
//                     m.year === visibleMonth.year &&
//                     m.month === visibleMonth.month,
//                 );
//                 if (idx > 0)
//                   flatRef.current?.scrollToIndex({
//                     index: idx - 1,
//                     animated: true,
//                   });
//               }}
//             >
//               <Text style={styles.navButtonText}>‹</Text>
//             </NeumorphicButton>
//             <NeumorphicButton
//               radius={neumorphic.radii.iconBtn}
//               distance={5}
//               style={styles.navButton}
//               onPress={() => {
//                 const idx = months.findIndex(
//                   m =>
//                     m.year === visibleMonth.year &&
//                     m.month === visibleMonth.month,
//                 );
//                 if (idx < months.length - 1)
//                   flatRef.current?.scrollToIndex({
//                     index: idx + 1,
//                     animated: true,
//                   });
//               }}
//             >
//               <Text style={styles.navButtonText}>›</Text>
//             </NeumorphicButton>
//           </View>
//         </View>
//       </View>
//     </Raised>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     padding: 14,
//     paddingBottom: 8,
//     overflow: 'hidden',
//   },
//   weekdayRow: {
//     flexDirection: 'row',
//     marginBottom: 8,
//   },
//   daysGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   dayText: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: neumorphic.colors.textPrimary,
//   },
//   futureCircle: {
//     backgroundColor: 'transparent',
//   },
//   futureText: {
//     color: neumorphic.colors.textMuted,
//     opacity: 0.5,
//   },
//   todayRing: {
//     borderWidth: 2,
//     borderColor: neumorphic.colors.textPrimary,
//   },
//   missedDot: {
//     position: 'absolute',
//     bottom: 4,
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: '#E2726B',
//   },
//   doneDot: {
//     position: 'absolute',
//     bottom: 4,
//     width: 4,
//     height: 4,
//     borderRadius: 2,
//   },
//   bottomNav: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginTop: 12,
//     paddingTop: 12,
//   },
//   monthPicker: {
//     overflow: 'hidden',
//   },
//   monthPickerHit: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//   },
//   monthPickerText: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: neumorphic.colors.textPrimary,
//   },
//   navButtons: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   navButton: {
//     width: 36,
//     height: 36,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   navButtonText: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: neumorphic.colors.textPrimary,
//   },
// });

// // import React, { useRef, useState, useMemo, useCallback } from 'react';
// // import { View, Text, Pressable, StyleSheet, FlatList, LayoutChangeEvent, Dimensions } from 'react-native';
// // import { toDateKey, isFuture } from '../services/dateUtils';
// // import { useHabitStore } from '../store/habitStore';

// // const CARD_H_PADDING = 28; // 14 + 14

// // interface Props {
// //   habitId: string;
// // }

// // const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// // const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// // function getMonthDays(year: number, month: number): (number | null)[] {
// //   const firstDay = new Date(year, month, 1).getDay();
// //   const daysInMonth = new Date(year, month + 1, 0).getDate();
// //   const cells: (number | null)[] = [];
// //   for (let i = 0; i < firstDay; i++) cells.push(null);
// //   for (let d = 1; d <= daysInMonth; d++) cells.push(d);
// //   return cells;
// // }

// // interface MonthPage {
// //   key: string;
// //   year: number;
// //   month: number;
// // }

// // function generateMonths(centerYear: number, centerMonth: number, range: number): MonthPage[] {
// //   const pages: MonthPage[] = [];
// //   const totalMonths = centerYear * 12 + centerMonth;
// //   for (let i = -range; i <= range; i++) {
// //     const m = totalMonths + i;
// //     const y = Math.floor(m / 12);
// //     const mo = m % 12;
// //     pages.push({ key: `${y}-${mo}`, year: y, month: mo });
// //   }
// //   return pages;
// // }

// // export default function MonthlyCalendar({ habitId }: Props) {
// //   const toggleCompletion = useHabitStore(s => s.toggleCompletion);
// //   const completions = useHabitStore(s => {
// //     const h = s.habits.find(h => h.id === habitId);
// //     return h?.completions ?? {};
// //   });

// //   const today = new Date();
// //   const todayStr = toDateKey(today);
// //   const centerIndex = 24;

// //   const months = useMemo(() => generateMonths(today.getFullYear(), today.getMonth(), 24), []);

// //   const flatRef = useRef<FlatList>(null);
// //   const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 100);
// //   const [visibleMonth, setVisibleMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
// //   const cellSize = containerWidth / 7;
// //   const circleSize = cellSize - 4;

// //   const CS = useMemo(() => ({
// //     weekdayText: { width: cellSize, textAlign: 'center' as const, fontSize: 12, fontWeight: '600' as const, color: '#777777' },
// //     spacer: { width: cellSize, height: cellSize },
// //     wrapper: { width: cellSize, height: cellSize, alignItems: 'center' as const, justifyContent: 'center' as const, position: 'relative' as const },
// //     hitArea: { width: cellSize, height: cellSize, alignItems: 'center' as const, justifyContent: 'center' as const },
// //     circle: { width: circleSize, height: circleSize, borderRadius: circleSize / 2, alignItems: 'center' as const, justifyContent: 'center' as const },
// //   }), [cellSize, circleSize]);

// //   const onLayout = useCallback((e: LayoutChangeEvent) => {
// //     setContainerWidth(e.nativeEvent.layout.width - CARD_H_PADDING);
// //   }, []);

// //   const onMomentumEnd = useCallback((e: any) => {
// //     const offset = e.nativeEvent.contentOffset.x;
// //     const index = Math.round(offset / containerWidth);
// //     const page = months[index];
// //     if (page) setVisibleMonth({ year: page.year, month: page.month });
// //   }, [containerWidth, months]);

// //   const renderMonth = useCallback(({ item }: { item: MonthPage }) => {
// //     const days = getMonthDays(item.year, item.month);
// //     return (
// //       <View style={{ width: containerWidth }}>
// //         <View style={styles.weekdayRow}>
// //           {WEEKDAYS.map((d, i) => (
// //             <Text key={i} style={CS.weekdayText}>{d}</Text>
// //           ))}
// //         </View>

// //         <View style={styles.daysGrid}>
// //           {days.map((day, i) => {
// //             if (day === null) {
// //               return <View key={`e-${i}`} style={CS.spacer} />;
// //             }
// //             const date = new Date(item.year, item.month, day);
// //             const dateKey = toDateKey(date);
// //             const isToday = dateKey === todayStr;
// //             const isFutureDay = isFuture(date);
// //             const isCompleted = !!completions[dateKey];
// //             const isMissed = !isFutureDay && !isCompleted && !isToday;

// //             let bg = 'transparent';
// //             if (isCompleted) bg = '#E8F5E9';

// //             return (
// //               <View key={dateKey} style={CS.wrapper}>
// //                 <Pressable
// //                   onPress={() => toggleCompletion(habitId, dateKey)}
// //                   disabled={isFutureDay}
// //                   style={CS.hitArea}
// //                 >
// //                   <View
// //                     style={[
// //                       CS.circle,
// //                       { backgroundColor: bg },
// //                       isToday && styles.todayBorder,
// //                     ]}
// //                   >
// //                     <Text
// //                       style={[
// //                         styles.dayText,
// //                         isFutureDay && styles.futureText,
// //                       ]}
// //                     >
// //                       {day}
// //                     </Text>
// //                   </View>
// //                 </Pressable>
// //                 {isMissed && <View style={styles.missedDot} />}
// //               </View>
// //             );
// //           })}
// //         </View>
// //       </View>
// //     );
// //   }, [containerWidth, CS, completions, habitId, toggleCompletion, todayStr]);

// //   const monthLabel = `${MONTHS[visibleMonth.month]} ${visibleMonth.year}`;

// //   return (
// //     <View style={styles.card} onLayout={onLayout}>
// //       <FlatList
// //         ref={flatRef}
// //         data={months}
// //         keyExtractor={item => item.key}
// //         renderItem={renderMonth}
// //         horizontal
// //         pagingEnabled
// //         showsHorizontalScrollIndicator={false}
// //         initialScrollIndex={centerIndex}
// //         getItemLayout={(_, index) => ({
// //           length: containerWidth,
// //           offset: containerWidth * index,
// //           index,
// //         })}
// //         onMomentumScrollEnd={onMomentumEnd}
// //         removeClippedSubviews
// //         windowSize={3}
// //       />

// //       <View style={styles.bottomNav}>
// //         <Pressable style={styles.monthPicker}>
// //           <Text style={styles.monthPickerText}>📅 {monthLabel}</Text>
// //         </Pressable>
// //         <View style={styles.navButtons}>
// //           <Pressable
// //             style={styles.navButton}
// //             onPress={() => {
// //               const idx = months.findIndex(m => m.year === visibleMonth.year && m.month === visibleMonth.month);
// //               if (idx > 0) flatRef.current?.scrollToIndex({ index: idx - 1, animated: true });
// //             }}
// //           >
// //             <Text style={styles.navButtonText}>‹</Text>
// //           </Pressable>
// //           <Pressable
// //             style={styles.navButton}
// //             onPress={() => {
// //               const idx = months.findIndex(m => m.year === visibleMonth.year && m.month === visibleMonth.month);
// //               if (idx < months.length - 1) flatRef.current?.scrollToIndex({ index: idx + 1, animated: true });
// //             }}
// //           >
// //             <Text style={styles.navButtonText}>›</Text>
// //           </Pressable>
// //         </View>
// //       </View>
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   card: {
// //     backgroundColor: '#FFFFFF',
// //     borderRadius: 14,
// //     padding: 14,
// //     paddingBottom: 8,
// //     overflow: 'hidden',
// //   },
// //   weekdayRow: {
// //     flexDirection: 'row',
// //     marginBottom: 8,
// //   },
// //   daysGrid: {
// //     flexDirection: 'row',
// //     flexWrap: 'wrap',
// //   },
// //   dayText: {
// //     fontSize: 15,
// //     fontWeight: '500',
// //     color: '#111111',
// //   },
// //   futureText: {
// //     opacity: 0.3,
// //   },
// //   todayBorder: {
// //     borderWidth: 2,
// //     borderColor: '#FF5A5F',
// //   },
// //   missedDot: {
// //     position: 'absolute',
// //     bottom: 4,
// //     width: 4,
// //     height: 4,
// //     borderRadius: 2,
// //     backgroundColor: '#FF3B30',
// //   },
// //   bottomNav: {
// //     flexDirection: 'row',
// //     justifyContent: 'space-between',
// //     alignItems: 'center',
// //     marginTop: 12,
// //     paddingTop: 12,
// //     borderTopWidth: StyleSheet.hairlineWidth,
// //     borderTopColor: '#E8E8E8',
// //   },
// //   monthPicker: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     paddingHorizontal: 12,
// //     paddingVertical: 8,
// //     borderRadius: 10,
// //     backgroundColor: '#F2F2F7',
// //   },
// //   monthPickerText: {
// //     fontSize: 14,
// //     fontWeight: '600',
// //     color: '#111111',
// //   },
// //   navButtons: {
// //     flexDirection: 'row',
// //     gap: 4,
// //   },
// //   navButton: {
// //     width: 36,
// //     height: 36,
// //     borderRadius: 10,
// //     backgroundColor: '#F2F2F7',
// //     alignItems: 'center',
// //     justifyContent: 'center',
// //   },
// //   navButtonText: {
// //     fontSize: 16,
// //     fontWeight: '600',
// //     color: '#111111',
// //   },
// // });
