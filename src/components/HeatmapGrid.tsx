import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { lastNWeeksGrid, toDateKey, isFuture } from '../services/dateUtils';

interface Props {
  completions: Record<string, boolean>;
  color: string;
  weeks?: number; // how many weeks of history to show
  cellSize?: number;
  gap?: number;
  onCellPress?: (dateKey: string) => void;
}

const CELL_EMPTY = '#E5E5EA';

export default function HeatmapGrid({
  completions,
  color,
  weeks = 20,
  cellSize = 12,
  gap = 3,
  onCellPress,
}: Props) {
  const grid = useMemo(() => lastNWeeksGrid(weeks), [weeks]);

  const width = weeks * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  return (
    <View>
      <Svg width={width} height={height}>
        {grid.map((week, wi) =>
          week.map((day, di) => {
            const key = toDateKey(day);
            const future = isFuture(day);
            const done = !!completions[key];
            const fill = future ? 'transparent' : done ? color : CELL_EMPTY;
            return (
              <Rect
                key={key}
                x={wi * (cellSize + gap)}
                y={di * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={3}
                fill={fill}
              />
            );
          }),
        )}
      </Svg>
      {/* Invisible touch targets overlaid so cells stay tappable (useful on the
          detail screen for backfilling a missed day). Skipped on tiny previews. */}
      {onCellPress && cellSize >= 10 && (
        <View style={[StyleSheet.absoluteFill, styles.touchOverlay]}>
          {grid.map((week, wi) => (
            <View key={wi} style={{ flexDirection: 'column' }}>
              {week.map((day, di) => {
                const key = toDateKey(day);
                const future = isFuture(day);
                return (
                  <Pressable
                    key={key}
                    disabled={future}
                    onPress={() => onCellPress(key)}
                    style={{
                      width: cellSize + gap,
                      height: cellSize + gap,
                      position: 'absolute',
                      left: wi * (cellSize + gap),
                      top: di * (cellSize + gap),
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  touchOverlay: {
    flexDirection: 'row',
  },
});
