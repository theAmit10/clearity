import { useState, useMemo, useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { colors, radii, spacing } from './theme';
import Raised from './Raised';
import HabitHeader from './HabitHeader';
import StreakHeatmap from './StreakHeatmap';
import PillsRow from './PillsRow';
import CalendarGrid from './CalendarGrid';
import FooterNav from './FooterNav';
import { Habit } from '../../types/habit';
import { computeStats } from '../../store/habitStore';

interface HabitCardProps {
  habit: Habit;
  onClose: () => void;
  onEdit: () => void;
  onOpenSettings: () => void;
  onToggleDay: (dateKey: string) => void;
}

const CARD_MAX_WIDTH = 460;
const CARD_MARGIN = 24;

export default function HabitCard({
  habit,
  onClose,
  onEdit,
  onOpenSettings,
  onToggleDay,
}: HabitCardProps) {
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = Math.min(screenWidth - CARD_MARGIN * 2, CARD_MAX_WIDTH);
  const innerPadding = spacing.xl * 2;
  const innerWidth = cardWidth - innerPadding;
  const circleSize = Math.floor(innerWidth / 7);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const stats = useMemo(() => computeStats(habit), [habit]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  return (
    <View style={{ width: cardWidth }}>
      <Raised radius={radii.card} distance={8}>
        <View
          style={{
            borderRadius: radii.card,
            backgroundColor: colors.background,
            padding: spacing.xl,
            gap: spacing.md,
          }}
        >
          <HabitHeader habit={habit} onClose={onClose} />

          <StreakHeatmap completions={habit.completions} />

          <PillsRow
            streakGoal={habit.goal || null}
            currentStreak={stats.currentStreak}
            onEdit={onEdit}
            onOpenSettings={onOpenSettings}
          />

          <View
            style={{
              height: 1,
              backgroundColor: colors.shadowDark + '40',
              marginVertical: spacing.xs,
            }}
          />

          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            completions={habit.completions}
            onToggleDay={onToggleDay}
            circleSize={circleSize}
          />

          <FooterNav
            year={viewYear}
            month={viewMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </View>
      </Raised>
    </View>
  );
}
