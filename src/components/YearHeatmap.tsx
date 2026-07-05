import React, { useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { useHabitStore } from '../store/habitStore';
import { Inset } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

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

function weekMonthLabels(
  weeks: Date[][],
): { label: string; col: number; key: string }[] {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
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
      setTimeout(
        () => scrollRef.current?.scrollTo({ x: offset, animated: false }),
        50,
      );
    }
  }, [todayWeekIndex]);

  const gridHeight = 7 * SIDE;
  const totalWidth = weeks.length * SIDE;

  return (
    // Sunken "tray" — the whole grid reads as pressed into the card,
    // with each completed day looking like a little lit-up pixel inside it.
    <Inset radius={neumorphic.radii.panel} style={styles.container}>
      <View style={{ flexDirection: 'row' }}>
        <View style={styles.weekdayCol}>
          {WEEKDAYS.map((day, i) => (
            <Text
              key={i}
              style={[styles.weekdayLabel, { height: SIDE, lineHeight: SIDE }]}
            >
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
            <View
              style={{ height: 14, position: 'relative', width: totalWidth }}
            >
              {monthLabels.map(({ label, col, key }) => (
                <Text
                  key={key}
                  style={[styles.monthLabel, { left: col * SIDE }]}
                >
                  {label}
                </Text>
              ))}
            </View>

            <View
              style={{
                position: 'relative',
                width: totalWidth,
                height: gridHeight,
              }}
            >
              {weeks.map((week, wi) => (
                <View
                  key={wi}
                  style={{
                    position: 'absolute',
                    left: wi * SIDE,
                    top: 0,
                    width: SIDE,
                    height: gridHeight,
                  }}
                >
                  {week.map((day, di) => {
                    const key = toDateKey(day);
                    const future = isFuture(day);
                    const daysInYear = day.getFullYear() === year;
                    const done = !!completions[key];

                    const cellBg = !daysInYear
                      ? 'transparent'
                      : future
                      ? neumorphic.colors.background
                      : done
                      ? color
                      : neumorphic.colors.insetFill;

                    return (
                      <View key={key} style={[styles.cell, { top: di * SIDE }]}>
                        <Pressable
                          disabled={future || !daysInYear}
                          onPress={() => toggleCompletion(habitId, key)}
                        >
                          <View
                            style={[
                              {
                                width: CELL,
                                height: CELL,
                                borderRadius: 2,
                                backgroundColor: cellBg,
                              },
                              daysInYear &&
                                !future &&
                                !done &&
                                styles.cellEmpty,
                              daysInYear && !future && done && styles.cellDone,
                            ]}
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
    </Inset>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    overflow: 'hidden',
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: neumorphic.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weekdayCol: {
    width: 28,
    marginRight: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    color: neumorphic.colors.textMuted,
    fontWeight: '700',
    textAlign: 'right',
    paddingRight: 4,
  },
  cell: {
    position: 'absolute',
    left: 1,
  },
  // Empty (not-yet-done) cell: faint carved-in border so it reads as a
  // tiny divot in the tray rather than a flat gray square.
  cellEmpty: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(179,187,201,0.5)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(179,187,201,0.4)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.6)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.45)',
  },
  // Done cell: thin dark edge so the filled color looks pressed in,
  // not just painted on top.
  cellDone: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.14)',
  },
});
