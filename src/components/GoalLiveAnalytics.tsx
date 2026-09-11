import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import type { Goal } from '../types/goal';
import {
  getLiveGoalStats,
  formatDuration,
  formatOverdue,
  ZONE_COPY_KEY,
} from '../services/goalUtils';
import { Raised } from './neumorphic/NeumorphicView';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function fullDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ZONE_COLORS: Record<string, string> = {
  halfway: '#FF9500',
  danger: '#FF3B30',
  overdue: '#FF3B30',
};

export default function GoalLiveAnalytics({
  goal,
  now,
}: {
  goal: Pick<Goal, 'color' | 'startAt' | 'endAt'>;
  now: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const stats = getLiveGoalStats(goal, now);

  const zoneColor = ZONE_COLORS[stats.zone] ?? goal.color;
  const zoneTitle = t(ZONE_COPY_KEY[stats.zone]);
  const zoneSub =
    stats.zone === 'overdue'
      ? formatOverdue(-stats.remainingMs)
      : t('goals.live.daysLeft', {
          duration: formatDuration(stats.remainingMs),
        });

  // Same available width as the completion timeline (inside countdown inset).
  const W = Math.max(200, screenWidth - 96);
  const PAD = 6;
  const fillWidth = ((W - PAD * 2) * stats.elapsedPct) / 100;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(fillWidth, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, fillWidth]);
  const fillProps = useAnimatedProps(() => ({ width: fill.value }));

  const keyDates = [
    {
      key: 'started',
      title: t('goals.live.startedDate'),
      at: new Date(goal.startAt).getTime(),
      passed: true,
      accent: goal.color,
    },
    {
      key: 'deadline',
      title: t('goals.live.deadlineDate'),
      at: new Date(goal.endAt).getTime(),
      passed: stats.zone === 'overdue',
      accent: stats.zone === 'overdue' ? '#FF3B30' : '#FF9500',
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: theme.colors.textMuted }]}>
        {t('goals.live.caption')}
      </Text>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Raised radius={16} distance={5} style={styles.banner}>
          <View style={[styles.dot, { backgroundColor: zoneColor }]} />
          <View style={styles.bannerText}>
            <Text
              style={[styles.bannerTitle, { color: theme.colors.textPrimary }]}
            >
              {zoneTitle}
            </Text>
            <Text
              style={[styles.bannerSub, { color: theme.colors.textMuted }]}
            >
              {zoneSub}
            </Text>
          </View>
          <View style={styles.dayBlock}>
            <Text style={[styles.dayWord, { color: theme.colors.textMuted }]}>
              {t('goals.live.dayWord')}
            </Text>
            <Text style={[styles.dayValue, { color: zoneColor }]}>
              {stats.dayCurrent}
              <Text style={[styles.dayTotal, { color: theme.colors.textMuted }]}>
                {' '}{t('goals.live.ofWord')} {stats.dayTotal}
              </Text>
            </Text>
          </View>
        </Raised>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(120)}>
        <Svg width={W} height={14}>
          <Defs>
            <LinearGradient id="goalLiveFill" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={goal.color} stopOpacity="0.45" />
              <Stop offset="1" stopColor={goal.color} />
            </LinearGradient>
          </Defs>
          <Rect
            x={PAD}
            y={2}
            width={W - PAD * 2}
            height={10}
            rx={5}
            fill={theme.colors.insetFill}
          />
          <AnimatedRect
            x={PAD}
            y={2}
            height={10}
            rx={5}
            fill="url(#goalLiveFill)"
            animatedProps={fillProps}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(220)}
        style={styles.milestoneRow}
      >
        {keyDates.map(m => (
          <View key={m.key} style={styles.milestoneWrap}>
            <Raised
              radius={14}
              distance={4}
              style={styles.milestone}
            >
              <View style={styles.milestoneText}>
                <Text
                  style={[
                    styles.milestoneTitle,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  {m.title}
                </Text>
                <Text
                  style={[
                    styles.milestoneSub,
                    { color: theme.colors.textPrimary },
                  ]}
                  numberOfLines={2}
                >
                  {fullDateTime(m.at)}
                </Text>
                <Text
                  style={[
                    styles.milestoneState,
                    {
                      color: m.passed
                        ? theme.colors.textMuted
                        : m.accent,
                    },
                  ]}
                >
                  {m.passed
                    ? t('goals.live.passedState')
                    : t('goals.live.daysLeft', {
                        duration: formatDuration(m.at - now),
                      })}
                </Text>
              </View>
            </Raised>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%', marginTop: 16 },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800' },
  bannerSub: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  dayBlock: { alignItems: 'flex-end' },
  dayWord: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayValue: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  dayTotal: { fontSize: 13, fontWeight: '700' },
  milestoneRow: { flexDirection: 'row', gap: 10 },
  milestoneWrap: { flex: 1 },
  milestone: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  milestoneText: { flex: 1, flexShrink: 1 },
  milestoneTitle: { fontSize: 14, fontWeight: '800' },
  milestoneSub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  milestoneState: { fontSize: 12, fontWeight: '800', marginTop: 3 },
});
