import React, { useRef, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { Inset } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

interface Props {
  completions: Record<string, boolean>;
  color: string;
  cellSize?: number;
  gap?: number;
  /** Kept only for backwards compatibility with older call sites — this
   * now always renders the full current year (scrollable), the same as
   * YearHeatmap, so a fixed week count no longer applies. */
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

/**
 * Compact read-only heatmap used inside HabitCard on the home list.
 * Same data and scroll behavior as the big YearHeatmap on the detail
 * screen (full current year, auto-scrolled to today) — just without the
 * weekday/month label gutters, and the tray itself stretches to the
 * card's full width instead of shrink-wrapping to a fixed pixel size.
 * The grid content is still 52+ weeks wide, so it scrolls horizontally
 * inside that full-width tray exactly like the detail screen version.
 */
export default function HeatmapGrid({
  completions,
  color,
  cellSize = 10,
  gap = 2,
}: Props) {
  const side = cellSize + gap;
  const year = new Date().getFullYear();
  const weeksData = useMemo(() => yearWeeks(year), [year]);
  const scrollRef = useRef<ScrollView>(null);

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
    <Inset radius={neumorphic.radii.panel} style={styles.tray}>
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
                const done = !!completions[key];

                const cellBg = !daysInYear
                  ? 'transparent'
                  : future
                  ? neumorphic.colors.background
                  : done
                  ? color
                  : neumorphic.colors.insetFill;

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
                        daysInYear && !future && !done && styles.cellEmpty,
                        daysInYear && !future && done && styles.cellDone,
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
  cellDone: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.14)',
  },
});

// import React, { useMemo } from 'react';
// import { View, StyleSheet } from 'react-native';
// import { toDateKey, isFuture, addDays } from '../services/dateUtils';
// import { Inset } from './neumorphic/NeumorphicView';
// import { neumorphic } from '../theme/neumorphicTheme';

// interface Props {
//   completions: Record<string, boolean>;
//   color: string;
//   weeks?: number;
//   cellSize?: number;
//   gap?: number;
// }

// /**
//  * Compact read-only heatmap used inside HabitCard on the home list.
//  * Same visual language as the big YearHeatmap on the detail screen —
//  * a sunken tray with faintly-bordered empty cells and pressed-in filled
//  * cells — just condensed to the last N weeks with no month/day labels,
//  * so it stays legible at list-item size instead of disappearing into
//  * the card background.
//  */
// export default function HeatmapGrid({
//   completions,
//   color,
//   weeks = 14,
//   cellSize = 10,
//   gap = 2,
// }: Props) {
//   const side = cellSize + gap;

//   const columns = useMemo(() => {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     // Align to the start (Sunday) of the current week, then walk back
//     // `weeks - 1` more weeks so the grid ends on the current week.
//     const currentWeekStart = addDays(today, -today.getDay());
//     const gridStart = addDays(currentWeekStart, -(weeks - 1) * 7);

//     const cols: Date[][] = [];
//     for (let w = 0; w < weeks; w++) {
//       const weekStart = addDays(gridStart, w * 7);
//       const col: Date[] = [];
//       for (let d = 0; d < 7; d++) {
//         col.push(addDays(weekStart, d));
//       }
//       cols.push(col);
//     }
//     return cols;
//   }, [weeks]);

//   const gridWidth = weeks * side;
//   const gridHeight = 7 * side;

//   return (
//     <Inset
//       radius={neumorphic.radii.panel}
//       style={[styles.tray, { width: gridWidth + 16 }]}
//     >
//       <View style={{ width: gridWidth, height: gridHeight }}>
//         {columns.map((col, ci) => (
//           <View
//             key={ci}
//             style={{
//               position: 'absolute',
//               left: ci * side,
//               top: 0,
//               width: side,
//               height: gridHeight,
//             }}
//           >
//             {col.map((day, di) => {
//               const key = toDateKey(day);
//               const future = isFuture(day);
//               const done = !!completions[key];

//               return (
//                 <View
//                   key={key}
//                   style={[
//                     styles.cell,
//                     {
//                       top: di * side,
//                       width: cellSize,
//                       height: cellSize,
//                       backgroundColor: future
//                         ? 'transparent'
//                         : done
//                         ? color
//                         : neumorphic.colors.insetFill,
//                     },
//                     !future && !done && styles.cellEmpty,
//                     !future && done && styles.cellDone,
//                   ]}
//                 />
//               );
//             })}
//           </View>
//         ))}
//       </View>
//     </Inset>
//   );
// }

// const styles = StyleSheet.create({
//   tray: {
//     padding: 8,
//     alignSelf: 'flex-start',
//     overflow: 'hidden',
//   },
//   cell: {
//     position: 'absolute',
//     left: 0,
//     borderRadius: 2,
//   },
//   cellEmpty: {
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(179,187,201,0.5)',
//     borderLeftWidth: 1,
//     borderLeftColor: 'rgba(179,187,201,0.4)',
//     borderBottomWidth: 1,
//     borderBottomColor: 'rgba(255,255,255,0.6)',
//     borderRightWidth: 1,
//     borderRightColor: 'rgba(255,255,255,0.45)',
//   },
//   cellDone: {
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.14)',
//   },
// });
