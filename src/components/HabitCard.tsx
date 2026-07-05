import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Habit } from '../types/habit';
import { computeStats } from '../store/habitStore';
import HeatmapGrid from './HeatmapGrid';
import { todayKey } from '../services/dateUtils';
import { Raised, Inset } from './neumorphic/NeumorphicView';
import { neumorphic } from '../theme/neumorphicTheme';
import { getHabitIcon } from '../constants/habitIcons';

interface Props {
  habit: Habit;
  onToggleToday: () => void;
  onPress: () => void;
}

export default function HabitCard({ habit, onToggleToday, onPress }: Props) {
  const stats = computeStats(habit);
  const doneToday = !!habit.completions[todayKey()];
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
    <Pressable onPress={onPress}>
      <Raised radius={neumorphic.radii.panel} distance={7} style={styles.card}>
        <View style={styles.header}>
          <Raised radius={16} distance={4} style={styles.iconBadge}>
            <Icon size={22} color={habit.color} />
          </Raised>

          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {habit.name}
            </Text>
            <View style={styles.streakRow}>
              {/* <Text style={styles.flame}>🔥</Text> */}
              <Text style={styles.streak}>
                {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'}
              </Text>
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
                  <Text style={[styles.checkMarkDone]}>✓</Text>
                </Inset>
              ) : (
                <Raised
                  radius={20}
                  distance={4}
                  style={[
                    styles.checkCircle,
                    styles.checkCircleEmpty,
                    { borderColor: habit.color },
                  ]}
                />
              )}
            </Pressable>
          </Animated.View>
        </View>

        <HeatmapGrid
          completions={habit.completions}
          color={habit.color}
          weeks={14}
          cellSize={10}
          gap={2}
        />
      </Raised>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: neumorphic.colors.textPrimary,
    letterSpacing: -0.2,
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
    color: neumorphic.colors.textMuted,
    fontWeight: '700',
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleEmpty: {
    borderWidth: 2.5,
    backgroundColor: neumorphic.colors.background,
  },
  checkMarkDone: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
});
