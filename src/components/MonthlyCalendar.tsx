import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, LayoutChangeEvent, Dimensions } from 'react-native';
import { toDateKey, isFuture } from '../services/dateUtils';
import { useHabitStore } from '../store/habitStore';

const CARD_H_PADDING = 28; // 14 + 14

interface Props {
  habitId: string;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

function generateMonths(centerYear: number, centerMonth: number, range: number): MonthPage[] {
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

export default function MonthlyCalendar({ habitId }: Props) {
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const completions = useHabitStore(s => {
    const h = s.habits.find(h => h.id === habitId);
    return h?.completions ?? {};
  });

  const today = new Date();
  const todayStr = toDateKey(today);
  const centerIndex = 24;

  const months = useMemo(() => generateMonths(today.getFullYear(), today.getMonth(), 24), []);

  const flatRef = useRef<FlatList>(null);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width - 100);
  const [visibleMonth, setVisibleMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const cellSize = containerWidth / 7;
  const circleSize = cellSize - 4;

  const CS = useMemo(() => ({
    weekdayText: { width: cellSize, textAlign: 'center' as const, fontSize: 12, fontWeight: '600' as const, color: '#777777' },
    spacer: { width: cellSize, height: cellSize },
    wrapper: { width: cellSize, height: cellSize, alignItems: 'center' as const, justifyContent: 'center' as const, position: 'relative' as const },
    hitArea: { width: cellSize, height: cellSize, alignItems: 'center' as const, justifyContent: 'center' as const },
    circle: { width: circleSize, height: circleSize, borderRadius: circleSize / 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  }), [cellSize, circleSize]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width - CARD_H_PADDING);
  }, []);

  const onMomentumEnd = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / containerWidth);
    const page = months[index];
    if (page) setVisibleMonth({ year: page.year, month: page.month });
  }, [containerWidth, months]);

  const renderMonth = useCallback(({ item }: { item: MonthPage }) => {
    const days = getMonthDays(item.year, item.month);
    return (
      <View style={{ width: containerWidth }}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={i} style={CS.weekdayText}>{d}</Text>
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
            const isCompleted = !!completions[dateKey];
            const isMissed = !isFutureDay && !isCompleted && !isToday;

            let bg = 'transparent';
            if (isCompleted) bg = '#E8F5E9';

            return (
              <View key={dateKey} style={CS.wrapper}>
                <Pressable
                  onPress={() => toggleCompletion(habitId, dateKey)}
                  disabled={isFutureDay}
                  style={CS.hitArea}
                >
                  <View
                    style={[
                      CS.circle,
                      { backgroundColor: bg },
                      isToday && styles.todayBorder,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isFutureDay && styles.futureText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
                {isMissed && <View style={styles.missedDot} />}
              </View>
            );
          })}
        </View>
      </View>
    );
  }, [containerWidth, CS, completions, habitId, toggleCompletion, todayStr]);

  const monthLabel = `${MONTHS[visibleMonth.month]} ${visibleMonth.year}`;

  return (
    <View style={styles.card} onLayout={onLayout}>
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

      <View style={styles.bottomNav}>
        <Pressable style={styles.monthPicker}>
          <Text style={styles.monthPickerText}>📅 {monthLabel}</Text>
        </Pressable>
        <View style={styles.navButtons}>
          <Pressable
            style={styles.navButton}
            onPress={() => {
              const idx = months.findIndex(m => m.year === visibleMonth.year && m.month === visibleMonth.month);
              if (idx > 0) flatRef.current?.scrollToIndex({ index: idx - 1, animated: true });
            }}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </Pressable>
          <Pressable
            style={styles.navButton}
            onPress={() => {
              const idx = months.findIndex(m => m.year === visibleMonth.year && m.month === visibleMonth.month);
              if (idx < months.length - 1) flatRef.current?.scrollToIndex({ index: idx + 1, animated: true });
            }}
          >
            <Text style={styles.navButtonText}>›</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    paddingBottom: 8,
    overflow: 'hidden',
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
    fontWeight: '500',
    color: '#111111',
  },
  futureText: {
    opacity: 0.3,
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#FF5A5F',
  },
  missedDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  monthPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
});
