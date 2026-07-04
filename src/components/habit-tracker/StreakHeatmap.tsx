import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { colors, radii, spacing, typography } from './theme';
import Pressed from './Pressed';

type CellState = 'empty' | 'faint' | 'filled';

interface StreakHeatmapProps {
  completions: Record<string, boolean>;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ROWS = ['Tue', 'Thu', 'Sat'] as const;
const CELL_SIZE = 8;
const CELL_GAP = 3;

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildHeatmapData(completions: Record<string, boolean>) {
  const now = new Date();
  return [5, 4, 3, 2, 1, 0].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const tue: CellState[] = [];
    const thu: CellState[] = [];
    const sat: CellState[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const wd = date.getDay();
      const key = toDateKey(date);
      const isPast = date <= now;
      const state: CellState = !isPast ? 'empty' : completions[key] ? 'filled' : 'faint';

      if (wd === 2) tue.push(state);
      else if (wd === 4) thu.push(state);
      else if (wd === 6) sat.push(state);
    }

    return {
      label: MONTH_NAMES[month].toUpperCase(),
      tue, thu, sat,
    };
  });
}

function Cell({ state }: { state: CellState }) {
  const bg = state === 'filled' ? colors.accent
    : state === 'faint' ? colors.accent + '40'
    : colors.backgroundDeep + '80';

  return <View style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2, backgroundColor: bg }} />;
}

export default function StreakHeatmap({ completions }: StreakHeatmapProps) {
  const data = useMemo(() => buildHeatmapData(completions), [completions]);

  const maxCells = Math.max(...data.flatMap(m => [m.tue.length, m.thu.length, m.sat.length]));
  const monthContentWidth = maxCells * (CELL_SIZE + CELL_GAP);
  const labelWidth = 30;

  return (
    <Pressed radius={radii.panel}>
      <View style={{ padding: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            marginLeft: labelWidth + spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          {data.map(m => (
            <View
              key={m.label}
              style={{
                width: monthContentWidth,
                alignItems: 'flex-start',
                paddingLeft: 0,
              }}
            >
              <Text style={[typography.label, { color: colors.textMuted }]}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        {ROWS.map(row => {
          const cells = row === 'Tue' ? data.map(d => d.tue)
            : row === 'Thu' ? data.map(d => d.thu)
            : data.map(d => d.sat);

          return (
            <View
              key={row}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
            >
              <Text
                style={[
                  typography.label,
                  { color: colors.textMuted, width: labelWidth },
                ]}
              >
                {row}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {cells.map((monthCells, mi) => (
                  <View
                    key={`${row}-${mi}`}
                    style={{
                      width: monthContentWidth,
                      flexDirection: 'row',
                      gap: CELL_GAP,
                    }}
                  >
                    {monthCells.map((state, ci) => (
                      <Cell key={`${row}-${mi}-${ci}`} state={state} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Pressed>
  );
}
