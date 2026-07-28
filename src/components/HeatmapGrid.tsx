import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { Inset } from './neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { computeEffectiveDateSet } from '../store/habitStore';

interface Props {
  completions: Record<string, number>;
  color: string;
  cellSize?: number;
  gap?: number;
  frequency?: 'daily' | 'n_times_per_week' | 'n_times_per_month' | 'n_times_in_m_days';
  frequencyValue?: number;
  frequencyWindow?: number;
  weeks?: number;
}

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

export default function HeatmapGrid({
  completions,
  color,
  cellSize = 10,
  gap = 2,
  frequency,
  frequencyValue,
  frequencyWindow,
}: Props) {
  const { theme } = useTheme();
  const { colors, radii } = theme;
  const side = cellSize + gap;
  const year = new Date().getFullYear();
  const weeksData = useMemo(() => yearWeeks(year), [year]);
  const scrollRef = useRef<ScrollView>(null);

  const effectiveSet = useMemo(() => {
    if (!frequency || frequency === 'daily') return null;
    return computeEffectiveDateSet({
      completions,
      frequency: frequency as any,
      frequencyValue,
      frequencyWindow,
    } as any);
  }, [completions, frequency, frequencyValue, frequencyWindow]);

  const todayWeekIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < weeksData.length; i++) {
      for (const d of weeksData[i]) {
        if (d.getTime() === today.getTime()) return i;
      }
    }
    return weeksData.length - 1;
  }, [weeksData]);

  useEffect(() => {
    if (scrollRef.current) {
      const offset = Math.max(0, todayWeekIndex - 6) * side;
      setTimeout(
        () => scrollRef.current?.scrollTo({ x: offset, animated: false }),
        50,
      );
    }
  }, [todayWeekIndex]);

  const gridHeight = 7 * side;
  const totalWidth = weeksData.length * side;

  return (
    <Inset radius={radii.panel} style={styles.tray}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={{ width: totalWidth, height: gridHeight }}>
          {weeksData.map((week, wi) => (
            <View
              key={wi}
              style={{
                position: 'absolute',
                left: wi * side,
                top: 0,
                width: side,
                height: gridHeight,
              }}
            >
              {week.map((day, di) => {
                const key = toDateKey(day);
                const future = isFuture(day);
                const daysInYear = day.getFullYear() === year;
                const done = effectiveSet ? effectiveSet.has(key) : !!completions[key];
                const raw = completions[key] || 0;
                const partial = frequency === 'n_times_in_m_days' && !done && raw > 0
                  ? Math.min(1, raw / (frequencyValue || 1))
                  : 0;

                const cellBg = !daysInYear
                  ? 'transparent'
                  : future
                  ? colors.background
                  : done
                  ? color
                  : partial > 0
                  ? `${color}${Math.round(partial * 255).toString(16).padStart(2, '0')}`
                  : colors.insetFill;

                return (
                  <View key={key} style={[styles.cell, { top: di * side }]}>
                    <View
                      style={[
                        {
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 2,
                          backgroundColor: cellBg,
                        },
                        daysInYear && !future && !done && {
                          borderTopWidth: 1,
                          borderTopColor: colors.shadowDark + '80',
                          borderLeftWidth: 1,
                          borderLeftColor: colors.shadowDark + '66',
                          borderBottomWidth: 1,
                          borderBottomColor: colors.shadowLight + '99',
                          borderRightWidth: 1,
                          borderRightColor: colors.shadowLight + '73',
                        },
                        daysInYear && !future && done && {
                          borderWidth: 1,
                          borderColor: 'rgba(0,0,0,0.14)',
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </Inset>
  );
}

const styles = StyleSheet.create({
  tray: {
    width: '100%',
    padding: 10,
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    left: 0,
  },
});
