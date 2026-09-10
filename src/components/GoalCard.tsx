import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Goal } from '../types/goal';
import { Raised } from './neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { getHabitIcon } from '../constants/habitIcons';
import { getCountdownParts, formatOverdue, getProgress } from '../services/goalUtils';
import { useTranslation } from '../i18n';

interface Props {
  goal: Goal;
  onPress: () => void;
}

export default function GoalCard({ goal, onPress }: Props) {
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
          <Raised radius={16} distance={4} style={styles.iconBadge}>
            <Icon size={22} color={goal.color} />
          </Raised>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {goal.title}
            </Text>
            <Text style={[styles.sub, { color: expired ? '#FF3B30' : theme.colors.textMuted }]} numberOfLines={1}>
              {expired ? `${t('goals.expired')} · ${sub}` : sub}
            </Text>
          </View>
          {completed && (
            <View style={[styles.badge, { backgroundColor: `${goal.color}1A` }]}>
              <Text style={[styles.badgeText, { color: goal.color }]}>✓</Text>
            </View>
          )}
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
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
});
