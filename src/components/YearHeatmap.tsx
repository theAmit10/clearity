import React, { useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { useHabitStore } from '../store/habitStore';

interface Props {
  habitId: string;
  color: string;
}

const CELL = 10;
const GAP = 2;
const SIDE = CELL + GAP;
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function yearWeeks(year: number): Date[][] {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const weeks: Date[][] = [];
  let cursor = new Date(start);
  cursor.setDate(cursor.getDate() - cursor.getDay());
  while (cursor <= end) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(cursor, d));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function weekMonthLabels(weeks: Date[][]): { label: string; col: number; key: string }[] {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels: { label: string; col: number; key: string }[] = [];
  let lastMonth = -1;
  let lastYear = 0;
  weeks.forEach((week, i) => {
    const d = week[3] ?? week[0];
    const m = d.getMonth();
    const y = d.getFullYear();
    if (m !== lastMonth || y !== lastYear) {
      labels.push({ label: names[m], col: i, key: `${y}-${m}` });
      lastMonth = m;
      lastYear = y;
    }
  });
  return labels;
}

export default function YearHeatmap({ habitId, color }: Props) {
  const toggleCompletion = useHabitStore(s => s.toggleCompletion);
  const completions = useHabitStore(s => {
    const h = s.habits.find(h => h.id === habitId);
    return h?.completions ?? {};
  });

  const year = new Date().getFullYear();
  const weeks = useMemo(() => yearWeeks(year), [year]);
  const monthLabels = useMemo(() => weekMonthLabels(weeks), [weeks]);
  const scrollRef = useRef<ScrollView>(null);

  const todayWeekIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < weeks.length; i++) {
      for (const d of weeks[i]) {
        if (d.getTime() === today.getTime()) return i;
      }
    }
    return weeks.length - 1;
  }, [weeks]);

  useEffect(() => {
    if (scrollRef.current) {
      const offset = Math.max(0, todayWeekIndex - 6) * SIDE;
      setTimeout(() => scrollRef.current?.scrollTo({ x: offset, animated: false }), 50);
    }
  }, [todayWeekIndex]);

  const gridHeight = 7 * SIDE;
  const totalWidth = weeks.length * SIDE;

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.weekdayCol}>
          {WEEKDAYS.map((day, i) => (
            <Text key={i} style={[styles.weekdayLabel, { height: SIDE, lineHeight: SIDE }]}>
              {day}
            </Text>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View>
            <View style={{ height: 14, position: 'relative', width: totalWidth }}>
              {monthLabels.map(({ label, col, key }) => (
                <Text key={key} style={[styles.monthLabel, { left: col * SIDE }]}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={{ position: 'relative', width: totalWidth, height: gridHeight }}>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ position: 'absolute', left: wi * SIDE, top: 0, width: SIDE, height: gridHeight }}>
                  {week.map((day, di) => {
                    const key = toDateKey(day);
                    const future = isFuture(day);
                    const daysInYear = day.getFullYear() === year;
                    const done = !!completions[key];
                    return (
                      <View key={key} style={[styles.cell, { top: di * SIDE }]}>
                        <Pressable
                          disabled={future || !daysInYear}
                          onPress={() => toggleCompletion(habitId, key)}
                        >
                          <View
                            style={{
                              width: CELL,
                              height: CELL,
                              borderRadius: 2,
                              backgroundColor: !daysInYear ? 'transparent' : future ? '#F0F0F0' : done ? color : '#E8E8E8',
                            }}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    overflow: 'hidden',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#777777',
    fontWeight: '600',
  },
  weekdayCol: {
    width: 28,
    marginRight: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    color: '#777777',
    textAlign: 'right',
    paddingRight: 4,
  },
  cell: {
    position: 'absolute',
    left: 1,
  },
});
