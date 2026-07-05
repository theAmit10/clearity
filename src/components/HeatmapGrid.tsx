import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { toDateKey, isFuture, addDays } from '../services/dateUtils';
import { Inset } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';

interface Props {
  completions: Record<string, boolean>;
  color: string;
  weeks?: number;
  cellSize?: number;
  gap?: number;
}

/**
 * Compact read-only heatmap used inside HabitCard on the home list.
 * Same visual language as the big YearHeatmap on the detail screen —
 * a sunken tray with faintly-bordered empty cells and pressed-in filled
 * cells — just condensed to the last N weeks with no month/day labels,
 * so it stays legible at list-item size instead of disappearing into
 * the card background.
 */
export default function HeatmapGrid({
  completions,
  color,
  weeks = 14,
  cellSize = 10,
  gap = 2,
}: Props) {
  const side = cellSize + gap;

  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Align to the start (Sunday) of the current week, then walk back
    // `weeks - 1` more weeks so the grid ends on the current week.
    const currentWeekStart = addDays(today, -today.getDay());
    const gridStart = addDays(currentWeekStart, -(weeks - 1) * 7);

    const cols: Date[][] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(gridStart, w * 7);
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(addDays(weekStart, d));
      }
      cols.push(col);
    }
    return cols;
  }, [weeks]);

  const gridWidth = weeks * side;
  const gridHeight = 7 * side;

  return (
    <Inset
      radius={neumorphic.radii.panel}
      style={[styles.tray, { width: gridWidth + 16 }]}
    >
      <View style={{ width: gridWidth, height: gridHeight }}>
        {columns.map((col, ci) => (
          <View
            key={ci}
            style={{
              position: 'absolute',
              left: ci * side,
              top: 0,
              width: side,
              height: gridHeight,
            }}
          >
            {col.map((day, di) => {
              const key = toDateKey(day);
              const future = isFuture(day);
              const done = !!completions[key];

              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    {
                      top: di * side,
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: future
                        ? 'transparent'
                        : done
                        ? color
                        : neumorphic.colors.insetFill,
                    },
                    !future && !done && styles.cellEmpty,
                    !future && done && styles.cellDone,
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </Inset>
  );
}

const styles = StyleSheet.create({
  tray: {
    padding: 8,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
    left: 0,
    borderRadius: 2,
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

// // import React, { useMemo } from 'react';
// // import { View, Pressable, StyleSheet } from 'react-native';
// // import Svg, { Rect } from 'react-native-svg';
// // import { lastNWeeksGrid, toDateKey, isFuture } from '../services/dateUtils';

// // interface Props {
// //   completions: Record<string, boolean>;
// //   color: string;
// //   weeks?: number; // how many weeks of history to show
// //   cellSize?: number;
// //   gap?: number;
// //   onCellPress?: (dateKey: string) => void;
// // }

// // const CELL_EMPTY = '#E5E5EA';

// // export default function HeatmapGrid({
// //   completions,
// //   color,
// //   weeks = 20,
// //   cellSize = 12,
// //   gap = 3,
// //   onCellPress,
// // }: Props) {
// //   const grid = useMemo(() => lastNWeeksGrid(weeks), [weeks]);

// //   const width = weeks * (cellSize + gap);
// //   const height = 7 * (cellSize + gap);

// //   return (
// //     <View>
// //       <Svg width={width} height={height}>
// //         {grid.map((week, wi) =>
// //           week.map((day, di) => {
// //             const key = toDateKey(day);
// //             const future = isFuture(day);
// //             const done = !!completions[key];
// //             const fill = future ? 'transparent' : done ? color : CELL_EMPTY;
// //             return (
// //               <Rect
// //                 key={key}
// //                 x={wi * (cellSize + gap)}
// //                 y={di * (cellSize + gap)}
// //                 width={cellSize}
// //                 height={cellSize}
// //                 rx={3}
// //                 fill={fill}
// //               />
// //             );
// //           }),
// //         )}
// //       </Svg>
// //       {/* Invisible touch targets overlaid so cells stay tappable (useful on the
// //           detail screen for backfilling a missed day). Skipped on tiny previews. */}
// //       {onCellPress && cellSize >= 10 && (
// //         <View style={[StyleSheet.absoluteFill, styles.touchOverlay]}>
// //           {grid.map((week, wi) => (
// //             <View key={wi} style={{ flexDirection: 'column' }}>
// //               {week.map((day, di) => {
// //                 const key = toDateKey(day);
// //                 const future = isFuture(day);
// //                 return (
// //                   <Pressable
// //                     key={key}
// //                     disabled={future}
// //                     onPress={() => onCellPress(key)}
// //                     style={{
// //                       width: cellSize + gap,
// //                       height: cellSize + gap,
// //                       position: 'absolute',
// //                       left: wi * (cellSize + gap),
// //                       top: di * (cellSize + gap),
// //                     }}
// //                   />
// //                 );
// //               })}
// //             </View>
// //           ))}
// //         </View>
// //       )}
// //     </View>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   touchOverlay: {
// //     flexDirection: 'row',
// //   },
// // });
