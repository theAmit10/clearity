import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { Goal } from '../types/goal';
import { Raised, Inset } from './neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { getHabitIcon } from '../constants/habitIcons';
import { getCountdownParts, formatOverdue, getProgress } from '../services/goalUtils';
import { useTranslation } from '../i18n';

interface Props {
  goal: Goal;
  onPress: () => void;
  /** Called when the quick-complete circle is tapped (ongoing goals only).
   * If omitted, the circle renders as a passive completed indicator. */
  onComplete?: (id: string) => void;
}

export default function GoalCard({ goal, onPress, onComplete }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const Icon = getHabitIcon(goal.icon);
  const completed = goal.status === 'completed';

  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [completed]);

  const parts = getCountdownParts(goal.endAt, now);
  const expired = !completed && parts.expired;
  const progress = completed ? 1 : getProgress(goal, now);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleComplete = () => {
    if (completed || !onComplete) return;
    scale.value = withSpring(1.15, { damping: 6 }, () => {
      scale.value = withSpring(1);
    });
    onComplete(goal.id);
  };

  const sub = completed
    ? t('goals.completed')
    : expired
      ? formatOverdue(parts.overdueMs)
      : parts.days > 0
        ? `${parts.days}d ${parts.hours}h left`
        : `${parts.hours}h ${parts.minutes}m left`;

  return (
    <Pressable onPress={onPress}>
      <Raised radius={theme.radii.panel} distance={7} style={styles.card}>
        <View style={styles.header}>
          <Raised radius={14} distance={4} style={styles.iconBadge}>
            <Icon size={20} color={goal.color} />
          </Raised>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={[styles.sub, { color: expired ? '#FF3B30' : theme.colors.textMuted }]} numberOfLines={1}>
              {expired ? `${t('goals.expired')} · ${sub}` : sub}
            </Text>
          </View>
          {completed ? (
            <Inset
              radius={17}
              style={[
                styles.checkCircle,
                { backgroundColor: goal.color },
              ]}
            >
              <Text style={styles.checkMarkDone}>✓</Text>
            </Inset>
          ) : onComplete ? (
            <Animated.View style={animatedStyle}>
              <Pressable onPress={handleComplete} hitSlop={8}>
                <Raised
                  radius={17}
                  distance={4}
                  style={[
                    styles.checkCircle,
                    styles.checkCircleEmpty,
                    { borderColor: goal.color, backgroundColor: theme.colors.background },
                  ]}
                />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
        <View style={[styles.track, { backgroundColor: theme.colors.insetFill }]}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: expired ? '#FF3B30' : goal.color }]} />
        </View>
      </Raised>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 13,
    marginHorizontal: 16,
    marginVertical: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkCircleEmpty: {
    borderWidth: 2,
  },
  checkMarkDone: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
