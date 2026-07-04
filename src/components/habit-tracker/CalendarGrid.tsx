import { useMemo } from 'react';
import { View, Text } from 'react-native';
import { colors } from './theme';
import WeekdayLabels from './WeekdayLabels';
import NeumorphicPressable from './NeumorphicPressable';

interface CalendarGridProps {
  year: number;
  month: number;
  completions: Record<string, boolean>;
  onToggleDay: (dateKey: string) => void;
  circleSize: number;
}

interface CellData {
  day: number;
  month: number;
  year: number;
  dateKey: string;
  isCurrentMonth: boolean;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildGrid(year: number, month: number): CellData[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

  const cells: CellData[] = [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const date = new Date(prevYear, prevMonth, d);
    cells.push({ day: d, month: prevMonth, year: prevYear, dateKey: toDateKey(date), isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ day: d, month, year, dateKey: toDateKey(date), isCurrentMonth: true });
  }

  const rem = (7 - (cells.length % 7)) % 7;
  if (rem > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= rem; d++) {
      const date = new Date(nextYear, nextMonth, d);
      cells.push({ day: d, month: nextMonth, year: nextYear, dateKey: toDateKey(date), isCurrentMonth: false });
    }
  }

  return cells;
}

export default function CalendarGrid({
  year,
  month,
  completions,
  onToggleDay,
  circleSize,
}: CalendarGridProps) {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const cellHeight = circleSize + 10;
  const dotSize = 5;
  const fontSize = circleSize < 38 ? 12 : 14;
  const circleRadius = circleSize / 2;

  const pressedFill = {
    backgroundColor: '#DADFE7',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.35)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(179,187,201,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179,187,201,0.15)',
  } as const;

  return (
    <View>
      <WeekdayLabels circleSize={circleSize} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map(cell => {
          const isToday = cell.dateKey === todayKey;
          const isDone = !!completions[cell.dateKey];

          const dayContent = (
            <>
              <View
                style={[
                  {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  isDone && pressedFill,
                  isToday && {
                    borderWidth: 2,
                    borderColor: colors.textPrimary,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize,
                    fontWeight: '700',
                    color: !cell.isCurrentMonth
                      ? colors.textMuted + '73'
                      : isDone && !isToday
                        ? colors.accent
                        : colors.textPrimary,
                    opacity: !cell.isCurrentMonth ? 0.45 : 1,
                  }}
                >
                  {cell.day}
                </Text>
              </View>
              {isDone && (
                <View
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: colors.accent,
                    marginTop: 2,
                  }}
                />
              )}
            </>
          );

          if (!cell.isCurrentMonth) {
            return (
              <View
                key={cell.dateKey}
                style={{ width: circleSize, height: cellHeight, alignItems: 'center', justifyContent: 'center' }}
              >
                {dayContent}
              </View>
            );
          }

          return (
            <NeumorphicPressable
              key={cell.dateKey}
              radius={circleRadius}
              distance={3}
              surfaceColor={colors.background}
              containerStyle={{
                width: circleSize,
                height: cellHeight,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => onToggleDay(cell.dateKey)}
            >
              {dayContent}
            </NeumorphicPressable>
          );
        })}
      </View>
    </View>
  );
}
