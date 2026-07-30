import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Habit } from '../types/habit';
import { computeStats, useHabitStore } from '../store/habitStore';
import HeatmapGrid from './HeatmapGrid';
import { todayKey } from '../services/dateUtils';
import { Raised, Inset } from './neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { getHabitIcon } from '../constants/habitIcons';
import Svg, { Path } from 'react-native-svg';

interface Props {
  habit: Habit;
  onToggleToday: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  isDragging?: boolean;
}

export default function HabitCard({
  habit,
  onToggleToday,
  onPress,
  onLongPress,
  isDragging,
}: Props) {
  const { theme } = useTheme();
  const showStreaks = useHabitStore(s => s.showStreaks);
  const showCategoryBadges = useHabitStore(s => s.showCategoryBadges);
  const showFrequency = useHabitStore(s => s.showFrequency);
  const stats = computeStats(habit);
  const count = habit.completions[todayKey()] || 0;
  const target = habit.frequency === 'n_times_in_m_days' ? (habit.frequencyValue ?? 1) : 1;
  const doneToday = count >= target;
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // habit.icon is now a heroicons key (e.g. "fire"), not an emoji — look
  // up the actual component instead of rendering the key as text.
  const Icon = getHabitIcon(habit.icon);

  const handleToggle = () => {
    scale.value = withSpring(1.15, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
    onToggleToday();
  };

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Raised
        radius={theme.radii.panel}
        distance={7}
        style={[styles.card, isDragging && styles.dragging]}
      >
        <View style={styles.header}>
          <Raised radius={16} distance={4} style={styles.iconBadge}>
            <Icon size={22} color={habit.color} />
          </Raised>

          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {habit.name}
              </Text>
              {showCategoryBadges && habit.category && habit.category !== 'none' && (
                <View style={[styles.catBadge, { backgroundColor: `${habit.color}1A` }]}>
                  <Text style={[styles.catBadgeText, { color: habit.color }]}>
                    {habit.category}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.streakRow}>
              {showStreaks && (
                <Text style={[styles.streak, { color: theme.colors.textMuted }]}>
                  {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'}{' '}
                  Streak
                </Text>
              )}
              {showFrequency && (
                <Text style={[styles.freqLabel, { color: theme.colors.textMuted }]}>
                  {habit.frequency === 'n_times_per_week'
                    ? `${habit.frequencyValue ?? 3}x / week`
                    : habit.frequency === 'n_times_per_month'
                    ? `${habit.frequencyValue ?? 1}x / month`
                    : habit.frequency === 'n_times_in_m_days'
                    ? `${habit.frequencyValue ?? 1}x / ${habit.frequencyWindow ?? 7} days`
                    : 'Daily'}
                </Text>
              )}
            </View>
          </View>

          {/*
            Today toggle. This needs to read as an obvious, tappable
            button — not just another neumorphic surface — so:
            - not done: raised circle with a solid colored ring, so the
              habit's own color is doing the "tap me" work
            - done: fully filled with that color (inset, so it looks
              pressed), white check, no ambiguity that it's complete
          */}
          <Animated.View style={animatedStyle}>
            <Pressable onPress={handleToggle} hitSlop={8}>
              {doneToday ? (
                <Inset
                  radius={20}
                  style={[
                    styles.checkCircle,
                    { backgroundColor: habit.color, borderColor: habit.color },
                  ]}
                >
                  <Text style={[styles.checkMarkDone, { color: '#FFFFFF' }]}>✓</Text>
                </Inset>
              ) : habit.frequency === 'n_times_in_m_days' ? (
                <Raised
                  radius={20}
                  distance={4}
                  style={[
                    styles.checkCircle,
                    styles.checkCircleEmpty,
                    { borderColor: habit.color, backgroundColor: theme.colors.background },
                  ]}
                >
                  <View style={{ position: 'absolute', top: 2.5, left: 2.5, width: 35, height: 35 }}>
                    <Svg width={35} height={35} viewBox="0 0 35 35">
                      {Array.from({ length: target }, (_, i) => {
                        const strokeW = 3;
                        const r = (35 - strokeW - 4) / 2;
                        const angleStep = (2 * Math.PI) / target;
                        const gapAngle = 0.15;
                        const segAngle = angleStep - gapAngle;
                        const a1 = i * angleStep - Math.PI / 2 + gapAngle / 2;
                        const a2 = a1 + segAngle;
                        const x1 = 17.5 + r * Math.cos(a1);
                        const y1 = 17.5 + r * Math.sin(a1);
                        const x2 = 17.5 + r * Math.cos(a2);
                        const y2 = 17.5 + r * Math.sin(a2);
                        const largeArc = segAngle > Math.PI ? 1 : 0;
                        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
                        const filled = i < count;
                        return (
                          <Path
                            key={i}
                            d={d}
                            stroke={filled ? habit.color : `${habit.color}26`}
                            strokeWidth={strokeW}
                            strokeLinecap="butt"
                            fill="none"
                          />
                        );
                      })}
                    </Svg>
                  </View>
                </Raised>
              ) : (
                <Raised
                  radius={20}
                  distance={4}
                  style={[
                    styles.checkCircle,
                    styles.checkCircleEmpty,
                    { borderColor: habit.color, backgroundColor: theme.colors.background },
                  ]}
                />
              )}
            </Pressable>
          </Animated.View>
        </View>

        <HeatmapGrid
          completions={habit.completions}
          color={habit.color}
          frequency={habit.frequency}
          frequencyValue={habit.frequencyValue}
          frequencyWindow={habit.frequencyWindow}
          weeks={14}
          cellSize={10}
          gap={2}
        />
      </Raised>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dragging: {
    opacity: 0.8,
    transform: [{ scale: 1.05 }],
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  flame: {
    fontSize: 12,
    marginRight: 4,
  },
  streak: {
    fontSize: 13,
    fontWeight: '700',
  },
  freqLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    opacity: 0.6,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkCircleEmpty: {
    borderWidth: 2.5,
  },
  checkMarkDone: {
    fontWeight: '800',
    fontSize: 18,
  },
});
