import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Line,
  Circle,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import FlagIcon from 'react-native-heroicons/outline/FlagIcon';
import ClockIcon from 'react-native-heroicons/outline/ClockIcon';
import TrophyIcon from 'react-native-heroicons/outline/TrophyIcon';
import type { Goal } from '../types/goal';
import {
  getGoalCompletionStats,
  getTimelineBounds,
  formatDuration,
  fitDurationUnit,
  milestonePercent,
} from '../services/goalUtils';
import { Raised } from './neumorphic/NeumorphicView';
import ProgressRing from './ProgressRing';
import { useTheme } from '../theme/ThemeProvider';
import { useTranslation } from '../i18n';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const { theme } = useTheme();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const from = 0;
    const start = Date.now();
    const duration = 800;
    let frame: number;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>
      {display}
      {suffix}
    </Text>
  );
}

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

type MilestoneIcon = React.ComponentType<{ size?: number; color?: string }>;

function MilestonePill({
  Icon,
  iconColor,
  day,
  percent,
  label,
  date,
  delay,
}: {
  Icon: MilestoneIcon;
  iconColor: string;
  day: number;
  percent: number;
  label: string;
  date: string;
  delay: number;
}) {
  const { theme } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ring = useSharedValue(0);
  const STROKE = 3;
  const RADIUS = 26;
  const perim =
    size.w > 0
      ? 2 * (size.w - STROKE + size.h - STROKE) -
        8 * RADIUS +
        2 * Math.PI * RADIUS
      : 0;

  useEffect(() => {
    ring.value = withDelay(
      delay,
      withTiming(percent, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
  }, [ring, percent, delay]);

  const ringProps = useAnimatedProps(
    () => ({ strokeDashoffset: perim * (1 - ring.value / 100) }),
    [perim],
  );

  return (
    <View style={styles.milestoneCol}>
      <View
        style={styles.pillWrap}
        onLayout={e =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        <Raised radius={28} distance={5} style={styles.pill}>
          <Icon size={22} color={iconColor} />
          <Text
            style={[styles.pillValue, { color: theme.colors.textPrimary }]}
          >
            {day}
          </Text>
        </Raised>
        {size.w > 0 && (
          <Svg
            width={size.w}
            height={size.h}
            style={StyleSheet.absoluteFill}
          >
            <Rect
              x={STROKE / 2}
              y={STROKE / 2}
              width={size.w - STROKE}
              height={size.h - STROKE}
              rx={RADIUS}
              fill="none"
              stroke={theme.colors.textMuted}
              strokeOpacity={0.3}
              strokeWidth={STROKE}
            />
            <AnimatedRect
              x={STROKE / 2}
              y={STROKE / 2}
              width={size.w - STROKE}
              height={size.h - STROKE}
              rx={RADIUS}
              fill="none"
              stroke={iconColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={perim}
              animatedProps={ringProps}
            />
          </Svg>
        )}
      </View>
      <Text style={[styles.milestoneLabel, { color: theme.colors.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.milestoneDate, { color: theme.colors.textMuted }]}>
        {date}
      </Text>
    </View>
  );
}

function fullDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function GoalCompletionAnalytics({
  goal,
}: {
  goal: Pick<Goal, 'color' | 'createdAt' | 'startAt' | 'endAt' | 'completedAt'>;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const stats = getGoalCompletionStats(goal);
  const bounds = getTimelineBounds(goal);
  const { created, start, end, done, t0, t1 } = bounds;

  const verdictColor =
    stats.verdict === 'late'
      ? '#FF3B30'
      : stats.verdict === 'on_time'
      ? '#FF9500'
      : goal.color;
  const deadlineColor =
    stats.verdict === 'late' ? '#FF3B30' : theme.colors.textPrimary;
  const verdictText =
    stats.verdict === 'late'
      ? t('goals.analytics.late', { duration: formatDuration(stats.delayMs) })
      : stats.verdict === 'on_time'
      ? t('goals.analytics.onTime')
      : `${t('goals.analytics.early')} · ${t('goals.analytics.aheadBy', {
          duration: formatDuration(stats.delayMs),
        })}`;

  // Timeline geometry. Available width inside the countdown inset =
  // screen - scroll padding (16*2) - card padding (20*2) - inset padding (12*2).
  const W = Math.max(200, screenWidth - 96);
  const PAD = 10;
  const TRACK_Y = 44;
  const x = (ms: number) => PAD + ((ms - t0) / (t1 - t0)) * (W - PAD * 2);
  const xCreated = x(created);
  const xStart = x(start);
  const xEnd = x(end);
  const xDone = x(done);
  const onTimeFillEnd = Math.min(xDone, xEnd);
  // Hide the Created marker when it would collide with the Start marker.
  const showCreatedMarker = xStart - xCreated > 18;

  const fill = useSharedValue(0);
  const lateFill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(onTimeFillEnd, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    if (xDone > xEnd) {
      lateFill.value = withDelay(
        700,
        withTiming(xDone - xEnd, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [fill, lateFill, onTimeFillEnd, xDone, xEnd]);

  const fillProps = useAnimatedProps(() => ({ width: fill.value }));
  const lateFillProps = useAnimatedProps(() => ({
    x: xEnd,
    width: lateFill.value,
  }));

  const taken = fitDurationUnit(stats.takenMs);
  const allowance = fitDurationUnit(stats.allottedMs);
  const gap = fitDurationUnit(stats.delayMs);

  const milestones: {
    key: string;
    Icon: MilestoneIcon;
    iconColor: string;
    ms: number;
  }[] = [
    { key: 'start', Icon: FlagIcon, iconColor: goal.color, ms: start },
    { key: 'deadline', Icon: ClockIcon, iconColor: '#FF9500', ms: end },
    { key: 'finished', Icon: TrophyIcon, iconColor: verdictColor, ms: done },
  ];
  const milestoneLabels: Record<string, string> = {
    start: t('goals.analytics.timelineStart'),
    deadline: t('goals.analytics.timelineDeadline'),
    finished: t('goals.analytics.timelineFinished'),
  };
  const chips: { label: string; value: number; suffix: string }[] = [
    {
      label: t('goals.analytics.taken'),
      value: taken.value,
      suffix: taken.suffix,
    },
    {
      label: t('goals.analytics.allowance'),
      value: allowance.value,
      suffix: allowance.suffix,
    },
    {
      label:
        stats.verdict === 'late'
          ? t('goals.analytics.delay')
          : t('goals.analytics.ahead'),
      value: gap.value,
      suffix: gap.suffix,
    },
    {
      label: t('goals.analytics.efficiency'),
      value: Math.round(stats.efficiencyPct),
      suffix: '%',
    },
  ];

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Raised radius={16} distance={5} style={styles.verdict}>
          <View
            style={[styles.verdictDot, { backgroundColor: verdictColor }]}
          />
          <Text
            style={[styles.verdictText, { color: theme.colors.textPrimary }]}
          >
            {verdictText}
          </Text>
        </Raised>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(120)}
        style={styles.ringRow}
      >
        <ProgressRing
          progress={Math.min(100, Math.round(stats.usedPct))}
          size={76}
          strokeWidth={9}
          color={verdictColor}
        />
        <View style={styles.ringText}>
          <Text style={[styles.ringPct, { color: theme.colors.textPrimary }]}>
            {Math.round(stats.usedPct)}%
          </Text>
          <Text style={[styles.ringLabel, { color: theme.colors.textMuted }]}>
            {t('goals.analytics.deadlineUsed')}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(220)}>
        <Text style={[styles.timelineTitle, { color: theme.colors.textMuted }]}>
          {t('goals.analytics.timeline')}
        </Text>
        <Svg width={W} height={110}>
          <Defs>
            <LinearGradient id="goalFill" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={goal.color} stopOpacity="0.45" />
              <Stop offset="1" stopColor={goal.color} />
            </LinearGradient>
            <LinearGradient id="goalLate" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FF3B30" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FF3B30" />
            </LinearGradient>
          </Defs>
          <Rect
            x={PAD}
            y={TRACK_Y}
            width={W - PAD * 2}
            height={10}
            rx={5}
            fill={theme.colors.insetFill}
          />
          {showCreatedMarker && (
            <Rect
              x={xCreated}
              y={TRACK_Y}
              width={Math.max(0, xStart - xCreated)}
              height={10}
              rx={5}
              fill={theme.colors.textMuted}
              opacity={0.35}
            />
          )}
          <AnimatedRect
            x={xStart}
            y={TRACK_Y}
            height={10}
            rx={5}
            fill="url(#goalFill)"
            animatedProps={fillProps}
          />
          {xDone > xEnd && (
            <AnimatedRect
              y={TRACK_Y}
              height={10}
              rx={5}
              fill="url(#goalLate)"
              animatedProps={lateFillProps}
            />
          )}
          <AnimatedG entering={FadeIn.delay(600).duration(400)}>
            {showCreatedMarker && (
              <Circle
                cx={xCreated}
                cy={TRACK_Y + 5}
                r={5}
                fill={theme.colors.background}
                stroke={theme.colors.textMuted}
                strokeWidth={2}
              />
            )}
            <Line
              x1={xEnd}
              y1={TRACK_Y - 8}
              x2={xEnd}
              y2={TRACK_Y + 18}
              stroke={theme.colors.textMuted}
              strokeWidth={2}
            />
            <Circle cx={xDone} cy={TRACK_Y + 5} r={7} fill={verdictColor} />
          </AnimatedG>
        </Svg>
        <View style={styles.milestoneRow}>
          {milestones.map((m, i) => (
            <MilestonePill
              key={m.key}
              Icon={m.Icon}
              iconColor={m.iconColor}
              day={new Date(m.ms).getDate()}
              percent={milestonePercent(m.ms, t0, t1)}
              label={milestoneLabels[m.key]}
              date={shortDate(m.ms)}
              delay={600 + i * 150}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(380)}
        style={styles.infoRow}
      >
        <Raised radius={14} distance={4} style={styles.infoChip}>
          <Text style={[styles.chipLabel, { color: theme.colors.textMuted }]}>
            {t('goals.analytics.createdAt')}
          </Text>
          <Text
            style={[styles.infoValue, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {fullDateTime(created)}
          </Text>
        </Raised>
        <Raised radius={14} distance={4} style={styles.infoChip}>
          <Text style={[styles.chipLabel, { color: theme.colors.textMuted }]}>
            {t('goals.analytics.deadlineAt')}
          </Text>
          <Text
            style={[styles.infoValue, { color: deadlineColor }]}
            numberOfLines={1}
          >
            {fullDateTime(end)}
          </Text>
        </Raised>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.duration(400).delay(480)}
        style={styles.chipGrid}
      >
        {chips.map(c => (
          <Raised key={c.label} radius={14} distance={4} style={styles.chip}>
            <CountUp value={c.value} suffix={c.suffix} />
            <Text style={[styles.chipLabel, { color: theme.colors.textMuted }]}>
              {c.label}
            </Text>
          </Raised>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, width: '100%' },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  verdictDot: { width: 12, height: 12, borderRadius: 6 },
  verdictText: { fontSize: 16, fontWeight: '800', flex: 1 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringText: { flex: 1 },
  ringPct: { fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ringLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  milestoneRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  milestoneCol: { flex: 1, alignItems: 'center', gap: 4 },
  pillWrap: { width: '100%' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
  },
  pillValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  milestoneLabel: { fontSize: 14, fontWeight: '700' },
  milestoneDate: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  infoValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  chipValue: { fontSize: 20, fontWeight: '800' },
  chipLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
