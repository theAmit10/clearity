import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Habit } from '../types/habit';
import { computeStats } from '../store/habitStore';
import HeatmapGrid from './HeatmapGrid';
import { todayKey } from '../services/dateUtils';

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

  const handleToggle = () => {
    scale.value = withSpring(1.15, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
    onToggleToday();
  };

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{habit.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{habit.name}</Text>
          <Text style={styles.streak}>
            🔥 {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'}
          </Text>
        </View>
        <Animated.View style={animatedStyle}>
          <Pressable
            onPress={handleToggle}
            style={[
              styles.checkCircle,
              { backgroundColor: doneToday ? habit.color : 'transparent', borderColor: habit.color },
            ]}>
            {doneToday && <Text style={styles.checkMark}>✓</Text>}
          </Pressable>
        </Animated.View>
      </View>
      <HeatmapGrid completions={habit.completions} color={habit.color} weeks={14} cellSize={10} gap={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: { fontSize: 26, marginRight: 10 },
  name: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  streak: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontWeight: '700' },
});
