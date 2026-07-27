/**
 * Analytics Screen
 *
 * All data is computed in src/services/statsService.ts via computeStats(habits).
 *
 * ─── Metrics breakdown ───
 *
 * Overall Stats:
 *   totalHabits          – count of non-archived habits
 *   totalCheckIns        – sum of all completion entries across all active habits
 *   currentStreak        – highest active consecutive-day streak of any habit
 *   bestStreak           – highest ever streak across all habits
 *   overallCompletionRate – average of each habit's completionRateAll (bounded 0–100)
 *   weekCompletionRate   – completions in last 7d / (activeCount × 7) × 100
 *   monthCompletionRate  – completions in last 30d / (activeCount × 30) × 100
 *   perfectDays          – days in last 30 where every active habit was done
 *   totalDaysTracked     – days since the earliest habit's createdAt
 *
 * Per-Habit Stats (HabitDetailStats):
 *   completionRateAll    – completed days / habit age (days since creation)
 *   completionRateWeek   – completions in last 7d / 7
 *   completionRateMonth  – completions in last 30d / 30
 *   currentStreak        – walks backwards from today counting consecutive done-days
 *   bestStreak           – sorts all completion dates, finds longest consecutive run
 *   trend                – compares last 7d vs prior 7d; diff > 1 = improving/declining
 *   avgPerWeek           – (totalCompletions / habitAge) × 7
 *   totalMisses          – habitAge - totalCompletions (clamped ≥ 0)
 *
 * Weekly Trend (12 weeks):
 *   Loops over last 12 Sun–Sat weeks. For each: count completions across all habits.
 *   rate = count / total × 100.
 *
 * Weekday Breakdown (90 days):
 *   Groups by day-of-week. rate = completions on that DOW / (activeCount × occurrences) × 100.
 *
 * Streak Analytics:
 *   streakHistory   – all streak sequences from all habits (consecutive day groups)
 *   averageStreak   – mean length of all streaks
 *   streaksBroken   – total streak entries − active habit count (each habit has ≥1 streak)
 *
 * Insights:
 *   Rules in computeStats() generate positive/negative/neutral insights based on:
 *   best/worst habit, current streak ≥ 7, perfect days ≥ 5, most/least consistent
 *   weekday, habits trending up/down.
 *
 * ─── Rendering notes ───
 * - Animations are triggered per-section when the section scrolls into viewport
 *   (see useAnimateOnEnter + handleScroll + registerSection).
 * - Charts use react-native-svg with Reanimated animated props for
 *   scroll-triggered entrance animations (bars grow from 0 → target).
 * - Summary cards and streak pills animate with scale + opacity.
 *
 * To add a new metric:
 *   1. Add the field to the relevant interface in statsService.ts
 *   2. Compute it in computeStats()
 *   3. Render it in this screen (add a new section or extend an existing one)
 *   4. Document it in this comment block.
 */
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Rect,
  Circle,
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { useHabitStore } from '../store/habitStore';
import {
  computeStats,
  type StatsData,
  type HabitDetailStats,
} from '../services/statsService';
import { getHabitIcon } from '../constants/habitIcons';
import { Raised, Inset } from '../components/neumorphic/NeumorphicView';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function shortMonthDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate();
}

function TrendArrow({
  trend,
  colors,
}: {
  trend: 'improving' | 'declining' | 'stable';
  colors: any;
}) {
  const color =
    trend === 'improving'
      ? colors.iosGreen
      : trend === 'declining'
      ? colors.iosRed
      : colors.textMuted;
  const arrow = trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→';
  return <Text style={[styles.trendArrow, { color }]}>{arrow}</Text>;
}

export default function AnalyticsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const habits = useHabitStore(s => s.habits);
  const cs = theme.colors;

  const stats = useMemo<StatsData>(() => computeStats(habits), [habits]);
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  const chartWidth = screenWidth - 64;
  const weeklyChartHeight = 180;
  const weeklyMargins = { left: 36, right: 8, top: 12, bottom: 44 };
  const weeklyInnerWidth =
    chartWidth - weeklyMargins.left - weeklyMargins.right;
  const weeklyBarWidth = Math.max(
    4,
    weeklyInnerWidth / stats.weeklyTrend.length - 4,
  );

  const weekdayChartHeight = 160;
  const weekdayMargins = { left: 40, right: 16, top: 8, bottom: 8 };
  const weekdayInnerWidth =
    chartWidth - weekdayMargins.left - weekdayMargins.right;

  const weeklyPlotHeight =
    weeklyChartHeight - weeklyMargins.top - weeklyMargins.bottom;

  const weekdayBarHeight = 14;
  const weekdayGap = 8;

  const scrollY = useRef(0);
  const sectionYs = useRef<Record<string, number>>({});
  const enteredRef = useRef<Record<string, boolean>>({});
  const [entered, setEntered] = useState<Record<string, boolean>>({});

  const markEntered = useCallback((key: string) => {
    if (!enteredRef.current[key]) {
      enteredRef.current[key] = true;
      setEntered(prev => ({ ...prev, [key]: true }));
    }
  }, []);

  const checkVisibleSections = useCallback(() => {
    const viewportBottom = scrollY.current + screenHeight;
    for (const [key, y] of Object.entries(sectionYs.current)) {
      if (y < viewportBottom + 60) {
        markEntered(key);
      }
    }
  }, [screenHeight, markEntered]);

  const handleScroll = (e: any) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    checkVisibleSections();
  };

  const registerSection = useCallback(
    (key: string, y: number) => {
      sectionYs.current[key] = y;
      if (y < scrollY.current + screenHeight + 60) {
        markEntered(key);
      }
    },
    [screenHeight, markEntered],
  );

  if (activeHabits.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: cs.background }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: cs.iosBlue }]}>←</Text>
          <Text style={[styles.backText, { color: cs.iosBlue }]}>Settings</Text>
        </Pressable>
        <View style={styles.emptyWrap}>
          <Raised radius={theme.radii.panel} distance={7} style={styles.empty}>
            <Text style={[styles.emptyText, { color: cs.textMuted }]}>
              No habits yet.{'\n'}Add some habits to see analytics and insights!
            </Text>
          </Raised>
        </View>
      </SafeAreaView>
    );
  }

  const improvingCount = stats.habitStats.filter(
    h => h.trend === 'improving',
  ).length;
  const decliningCount = stats.habitStats.filter(
    h => h.trend === 'declining',
  ).length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: cs.background }]}
    >
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — matching Notifications screen style */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <Text style={[styles.backArrow, { color: cs.iosBlue }]}>←</Text>
          <Text style={[styles.backText, { color: cs.iosBlue }]}>Settings</Text>
        </Pressable>
        <Text style={[styles.pageTitle, { color: cs.textPrimary }]}>
          Analytics
        </Text>

        {/* Summary Cards + Circular Ring */}
        <View
          onLayout={e => registerSection('summary', e.nativeEvent.layout.y)}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Total Habits"
                value={stats.overall.totalHabits}
                cs={cs}
                radii={theme.radii}
                delay={0}
                entered={entered['summary']}
              />
              <SummaryCard
                label="Best Streak"
                value={stats.overall.bestStreak}
                suffix="d"
                cs={cs}
                radii={theme.radii}
                delay={100}
                entered={entered['summary']}
              />
              <SummaryCard
                label="Perfect Days"
                value={stats.overall.perfectDays}
                cs={cs}
                radii={theme.radii}
                delay={200}
                entered={entered['summary']}
              />
              <SummaryCard
                label="Check-Ins"
                value={stats.overall.totalCheckIns}
                cs={cs}
                radii={theme.radii}
                delay={300}
                entered={entered['summary']}
              />
            </View>
            <CircularRing
              rate={stats.overall.overallCompletionRate}
              size={100}
              strokeWidth={10}
              color={cs.accent}
              label="Avg Consistency"
              cs={cs}
              entered={entered['summary']}
            />
          </View>
        </View>

        {/* Weekly Overview */}
        <View onLayout={e => registerSection('weekly', e.nativeEvent.layout.y)}>
          <WeeklyChart
            data={stats.weeklyTrend}
            chartWidth={chartWidth}
            chartHeight={weeklyChartHeight}
            margins={weeklyMargins}
            innerWidth={weeklyInnerWidth}
            barWidth={weeklyBarWidth}
            plotHeight={weeklyPlotHeight}
            cs={cs}
            radii={theme.radii}
            entered={entered['weekly']}
          />
        </View>

        {/* Completion Rings */}
        <View
          onLayout={e => registerSection('habitRings', e.nativeEvent.layout.y)}
        >
          <Text style={[styles.sectionTitleExt, { color: cs.textPrimary }]}>
            Completion Rings
          </Text>
          <Text style={[styles.sectionSubtitleExt, { color: cs.textMuted }]}>
            At a glance view of each habit's overall consistency.
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
          >
            {stats.habitStats
              .slice()
              .sort((a, b) => b.completionRateAll - a.completionRateAll)
              .map(h => (
                <MiniRing
                  key={h.id}
                  rate={h.completionRateAll}
                  size={72}
                  strokeWidth={6}
                  color={h.color}
                  label={h.name}
                  icon={h.icon}
                  trend={h.trend}
                  cs={cs}
                  entered={entered['habitRings']}
                />
              ))}
          </ScrollView>
        </View>

        {/* Day-of-Week Breakdown */}
        <View
          onLayout={e => registerSection('weekday', e.nativeEvent.layout.y)}
        >
          <WeekdayChart
            data={stats.weekdayBreakdown}
            chartWidth={chartWidth}
            chartHeight={weekdayChartHeight}
            margins={weekdayMargins}
            innerWidth={weekdayInnerWidth}
            barHeight={weekdayBarHeight}
            gap={weekdayGap}
            cs={cs}
            radii={theme.radii}
            entered={entered['weekday']}
          />
        </View>

        {/* Habit Scorecard */}
        <View onLayout={e => registerSection('habits', e.nativeEvent.layout.y)}>
          <Text style={[styles.sectionTitleExt, { color: cs.textPrimary }]}>
            Habit Scorecard
          </Text>
          <Text style={[styles.sectionSubtitleExt, { color: cs.textMuted }]}>
            Your habits ranked by consistency, with recent trend.
          </Text>
          {stats.habitStats.length > 0 && (
            <Text style={[styles.hintRow, { color: cs.textMuted }]}>
              {improvingCount > 0 ? `↑ ${improvingCount} improving` : ''}
              {improvingCount > 0 && decliningCount > 0 ? ' · ' : ''}
              {decliningCount > 0 ? `↓ ${decliningCount} declining` : ''}
              {improvingCount === 0 && decliningCount === 0
                ? '→ All stable'
                : ''}
            </Text>
          )}
          {stats.habitStats
            .slice()
            .sort((a, b) => b.completionRateAll - a.completionRateAll)
            .map((h, i) => (
              <HabitPerformanceRow
                key={h.id}
                habit={h}
                cs={cs}
                radii={theme.radii}
                entered={entered['habits']}
                index={i}
              />
            ))}
        </View>

        {/* Streak Analytics */}
        <View onLayout={e => registerSection('streak', e.nativeEvent.layout.y)}>
          <StreakSection
            stats={stats}
            cs={cs}
            radii={theme.radii}
            entered={entered['streak']}
          />
        </View>

        {/* Habit Timeline */}
        <View
          onLayout={e => registerSection('journey', e.nativeEvent.layout.y)}
        >
          <Text style={[styles.sectionTitleExt, { color: cs.textPrimary }]}>
            Habit Timeline
          </Text>
          <Text style={[styles.sectionSubtitleExt, { color: cs.textMuted }]}>
            How long you've kept each habit and how often you've done it.
          </Text>
          {stats.habitStats
            .slice()
            .sort((a, b) => b.habitAge - a.habitAge)
            .map((hs, i) => (
              <HabitJourneyCard
                key={hs.id}
                habit={hs}
                cs={cs}
                radii={theme.radii}
                entered={entered['journey']}
                index={i}
              />
            ))}
        </View>

        {/* Insights */}
        <View
          onLayout={e => registerSection('insights', e.nativeEvent.layout.y)}
        >
          <Text style={[styles.sectionTitleExt, { color: cs.textPrimary }]}>
            Insights
          </Text>
          <Text style={[styles.sectionSubtitleExt, { color: cs.textMuted }]}>
            Smart observations about your habit patterns.
          </Text>
          {stats.insights.map((item, i) => (
            <InsightItem
              key={'i-' + i}
              insight={item}
              cs={cs}
              radii={theme.radii}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Scroll-triggered animated wrapper ─── */
function useAnimateOnEnter(entered: boolean | undefined, delay = 0) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (entered) {
      progress.value = withDelay(
        delay,
        withTiming(1, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, delay]);
  return progress;
}

/* ─── Circular Progress Ring ─── */
function CircularRing({
  rate,
  size,
  strokeWidth,
  color,
  label,
  cs,
  entered,
}: {
  rate: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  cs: any;
  entered?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useAnimateOnEnter(entered, 200);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value * (rate / 100)),
  }));

  const half = size / 2;

  return (
    <View style={{ alignItems: 'center', width: size + 16 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={half}
            cy={half}
            r={radius}
            stroke={cs.backgroundDeep}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={half}
            cy={half}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${half}, ${half}`}
          />
          <SvgText
            x={half}
            y={half + 6}
            textAnchor="middle"
            fill={cs.textPrimary}
            fontSize={20}
            fontWeight="800"
          >
            {rate}%
          </SvgText>
        </Svg>
      </View>
      <Text
        style={{
          fontSize: 10,
          color: cs.textMuted,
          fontWeight: '600',
          marginTop: 6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─── Mini Ring (per-habit) ─── */
function MiniRing({
  rate,
  size,
  strokeWidth,
  color,
  label,
  icon,
  trend,
  cs,
  entered,
}: {
  rate: number;
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  icon: string;
  trend: 'improving' | 'declining' | 'stable';
  cs: any;
  entered?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useAnimateOnEnter(entered, 200);
  const Icon = getHabitIcon(icon);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value * (rate / 100)),
  }));

  return (
    <View style={{ alignItems: 'center', marginHorizontal: 6, width: 88 }}>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: size + 8,
          height: size + 8,
        }}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={cs.backgroundDeep}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={{ position: 'absolute' }}>
          <Icon size={18} color={color} />
        </View>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: cs.textPrimary,
          marginTop: 6,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <View
          style={[styles.ringGradeBadge, { backgroundColor: color + '22' }]}
        >
          <Text style={{ fontSize: 9, fontWeight: '800', color }}>
            {rate >= 90
              ? 'A'
              : rate >= 75
              ? 'B'
              : rate >= 50
              ? 'C'
              : rate >= 25
              ? 'D'
              : 'F'}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{rate}%</Text>
        <TrendArrow trend={trend} colors={cs} />
      </View>
    </View>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({
  label,
  value,
  suffix,
  cs,
  radii,
  delay,
  entered,
}: {
  label: string;
  value: number;
  suffix?: string;
  cs: any;
  radii: any;
  delay: number;
  entered?: boolean;
}) {
  const progress = useAnimateOnEnter(entered, delay);
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={[styles.summaryCardWrap, animStyle]}>
      <Raised radius={radii.card} distance={5} style={styles.summaryCard}>
        <Text style={[styles.summaryValue, { color: cs.textPrimary }]}>
          {value}
          {suffix ?? ''}
        </Text>
        <Text style={[styles.summaryLabel, { color: cs.textMuted }]}>
          {label}
        </Text>
      </Raised>
    </Animated.View>
  );
}

function barGradient(rate: number, cs: any): string {
  if (rate >= 70) return 'greenBarGrad';
  if (rate >= 40) return 'amberBarGrad';
  return 'redBarGrad';
}

/* ─── Weekly Overview ─── */
function WeeklyChart({
  data,
  chartWidth,
  chartHeight,
  margins,
  innerWidth,
  barWidth,
  plotHeight,
  cs,
  radii,
  entered,
}: {
  data: StatsData['weeklyTrend'];
  chartWidth: number;
  chartHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  innerWidth: number;
  barWidth: number;
  plotHeight: number;
  cs: any;
  radii: any;
  entered?: boolean;
}) {
  const progress = useAnimateOnEnter(entered, 300);

  const bestWeek = data.reduce(
    (best, w) => (w.rate > best.rate ? w : best),
    data[0],
  );
  const worstWeek = data.reduce(
    (worst, w) => (w.rate < worst.rate ? w : worst),
    data[0],
  );

  return (
    <Raised radius={radii.panel} distance={6} style={styles.chartContainer}>
      <Text style={[styles.sectionTitle, { color: cs.textPrimary }]}>
        Weekly Overview
      </Text>
      <Text style={[styles.sectionSubtitle, { color: cs.textMuted }]}>
        Are you staying consistent? Each bar is one week.
      </Text>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="greenBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cs.iosGreen} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.iosGreen} stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cs.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.accent} stopOpacity="0.3" />
          </LinearGradient>
          <LinearGradient id="redBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cs.iosRed} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.iosRed} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        <G x={margins.left} y={0}>
          {[0, 25, 50, 75, 100].map(pct => {
            const yPos =
              chartHeight - margins.bottom - (pct / 100) * plotHeight;
            return (
              <React.Fragment key={pct}>
                <Line
                  x1={0}
                  y1={yPos}
                  x2={innerWidth}
                  y2={yPos}
                  stroke={cs.textMuted}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <SvgText
                  x={-8}
                  y={yPos + 4}
                  fill={cs.textMuted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {pct}%
                </SvgText>
              </React.Fragment>
            );
          })}
          {data.map((point, i) => {
            const targetHeight = Math.max(2, (point.rate / 100) * plotHeight);
            const x = i * (innerWidth / data.length) + 2;
            const y = chartHeight - margins.bottom - targetHeight;
            const w = barWidth;
            return (
              <AnimatedBar
                key={point.weekStart}
                x={x}
                y={y}
                width={w}
                targetHeight={targetHeight}
                progress={progress}
                rx={4}
                gradientId={barGradient(point.rate, cs)}
              />
            );
          })}
          {data.map((point, i) => {
            const x = i * (innerWidth / data.length) + 2 + barWidth / 2;
            const yPos = i % 2 === 0 ? chartHeight - 6 : chartHeight - 20;
            return (
              <SvgText
                key={'lb-' + point.weekStart}
                x={x}
                y={yPos}
                fill={cs.textMuted}
                fontSize={8}
                textAnchor="middle"
              >
                {shortMonthDay(point.weekStart)}
              </SvgText>
            );
          })}
        </G>
      </Svg>
      <Text style={[styles.chartHint, { color: cs.textMuted }]}>
        ● Best week: {bestWeek.rate}% ({shortMonthDay(bestWeek.weekStart)}) ·
        Lowest: {worstWeek.rate}% ({shortMonthDay(worstWeek.weekStart)})
      </Text>
    </Raised>
  );
}

function AnimatedBar({
  x,
  y,
  width,
  targetHeight,
  progress,
  rx,
  gradientId,
}: {
  x: number;
  y: number;
  width: number;
  targetHeight: number;
  progress: SharedValue<number>;
  rx: number;
  gradientId: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    height: targetHeight * progress.value,
    y: y + targetHeight * (1 - progress.value),
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      width={width}
      height={0}
      rx={rx}
      ry={rx}
      fill={`url(#${gradientId})`}
      animatedProps={animatedProps}
    />
  );
}

/* ─── Weekday Breakdown Chart ─── */
function WeekdayChart({
  data,
  chartWidth,
  chartHeight,
  margins,
  innerWidth,
  barHeight,
  gap,
  cs,
  radii,
  entered,
}: {
  data: StatsData['weekdayBreakdown'];
  chartWidth: number;
  chartHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  innerWidth: number;
  barHeight: number;
  gap: number;
  cs: any;
  radii: any;
  entered?: boolean;
}) {
  const progress = useAnimateOnEnter(entered, 400);
  const sorted = [...data].sort((a, b) => b.rate - a.rate);
  const bestDay = sorted[0];
  const worstDay = sorted[sorted.length - 1];

  return (
    <Raised radius={radii.panel} distance={6} style={styles.chartContainer}>
      <Text style={[styles.sectionTitle, { color: cs.textPrimary }]}>
        Your Best Days
      </Text>
      <Text style={[styles.sectionSubtitle, { color: cs.textMuted }]}>
        Which weekdays you're most likely to follow through.
      </Text>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="wdGreenGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={cs.iosGreen} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.iosGreen} stopOpacity="0.4" />
          </LinearGradient>
          <LinearGradient id="wdAmberGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={cs.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.accent} stopOpacity="0.35" />
          </LinearGradient>
          <LinearGradient id="wdRedGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={cs.iosRed} stopOpacity="1" />
            <Stop offset="1" stopColor={cs.iosRed} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        <G x={margins.left} y={margins.top}>
          {sorted.map((item, i) => {
            const y = i * (barHeight + gap);
            const targetWidth = Math.max(2, (item.rate / 100) * innerWidth);
            const gId =
              item.rate >= 70
                ? 'wdGreenGrad'
                : item.rate >= 40
                ? 'wdAmberGrad'
                : 'wdRedGrad';
            return (
              <G key={item.day}>
                <SvgText
                  x={-8}
                  y={y + barHeight - 2}
                  fill={cs.textMuted}
                  fontSize={11}
                  textAnchor="end"
                >
                  {item.day}
                </SvgText>
                <Rect
                  x={0}
                  y={y}
                  width={innerWidth}
                  height={barHeight}
                  rx={7}
                  ry={7}
                  fill={cs.backgroundDeep}
                  opacity={0.5}
                />
                <AnimatedBarWidth
                  x={0}
                  y={y}
                  targetWidth={targetWidth}
                  height={barHeight}
                  progress={progress}
                  gradientId={gId}
                />
              </G>
            );
          })}
        </G>
      </Svg>
      {bestDay && bestDay.rate > 0 && (
        <Text style={[styles.chartHint, { color: cs.textMuted }]}>
          {worstDay && worstDay.rate > 0 && worstDay.day !== bestDay.day
            ? `● Most consistent on ${bestDay.day}s. ${worstDay.day}s need the most work.`
            : `● Most consistent on ${bestDay.day}s.`}
        </Text>
      )}
    </Raised>
  );
}

function AnimatedBarWidth({
  x,
  y,
  height,
  targetWidth,
  progress,
  gradientId,
}: {
  x: number;
  y: number;
  height: number;
  targetWidth: number;
  progress: SharedValue<number>;
  gradientId: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    width: targetWidth * progress.value,
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      width={0}
      height={height}
      rx={7}
      ry={7}
      fill={`url(#${gradientId})`}
      animatedProps={animatedProps}
    />
  );
}

/* ─── Per-Habit Performance Row ─── */
function HabitPerformanceRow({
  habit,
  cs,
  radii,
  entered,
  index,
}: {
  habit: any;
  cs: any;
  radii: any;
  entered?: boolean;
  index: number;
}) {
  const progress = useAnimateOnEnter(entered, 500 + index * 80);
  const Icon = getHabitIcon(habit.icon);

  const slideInStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * 30 }],
  }));

  const grade =
    habit.completionRateAll >= 90
      ? 'A'
      : habit.completionRateAll >= 75
      ? 'B'
      : habit.completionRateAll >= 50
      ? 'C'
      : habit.completionRateAll >= 25
      ? 'D'
      : 'F';
  const gradeColor =
    habit.completionRateAll >= 90
      ? cs.iosGreen
      : habit.completionRateAll >= 75
      ? cs.accent
      : habit.completionRateAll >= 50
      ? cs.accent
      : cs.iosRed;

  const trendBg =
    habit.trend === 'improving'
      ? cs.iosGreen + '22'
      : habit.trend === 'declining'
      ? cs.iosRed + '22'
      : 'transparent';

  return (
    <View style={styles.habitRowOuter}>
      <Animated.View style={slideInStyle}>
        <Raised radius={radii.panel} distance={5} style={styles.habitCard}>
          <View style={styles.habitRowTop}>
            <View style={styles.habitRowLeft}>
              <View
                style={[
                  styles.habitIconWrap,
                  { backgroundColor: habit.color + '22' },
                ]}
              >
                <Icon size={20} color={habit.color} />
              </View>
              <View style={styles.habitRowInfo}>
                <Text
                  style={[styles.habitRowName, { color: cs.textPrimary }]}
                  numberOfLines={1}
                >
                  {habit.name}
                </Text>
                <View style={styles.habitMetaRow}>
                  <Text style={[styles.habitMetaText, { color: cs.textMuted }]}>
                    {habit.currentStreak > 0
                      ? `🔥 ${habit.currentStreak}d`
                      : 'No streak'}
                  </Text>
                  <View style={[styles.trendTag, { backgroundColor: trendBg }]}>
                    <TrendArrow trend={habit.trend} colors={cs} />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.habitRowRight}>
              <View
                style={[
                  styles.gradeBadge,
                  { backgroundColor: gradeColor + '22' },
                ]}
              >
                <Text style={[styles.gradeText, { color: gradeColor }]}>
                  {grade}
                </Text>
              </View>
              <Text style={[styles.habitRowRate, { color: cs.accent }]}>
                {habit.completionRateAll}%
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.progressBarOuter,
              { backgroundColor: cs.backgroundDeep },
            ]}
          >
            <GradientProgressBar
              progress={progress}
              rate={habit.completionRateAll}
              accent={cs.accent}
            />
          </View>
          <View style={styles.habitRowBottom}>
            <Text style={[styles.habitMetaText, { color: cs.textMuted }]}>
              {habit.totalCompletions} done · {habit.totalMisses} missed
            </Text>
            <Text style={[styles.habitMetaText, { color: cs.textMuted }]}>
              {habit.avgPerWeek}/wk avg
            </Text>
          </View>
        </Raised>
      </Animated.View>
    </View>
  );
}

function GradientProgressBar({
  progress,
  rate,
  accent,
}: {
  progress: SharedValue<number>;
  rate: number;
  accent: string;
}) {
  const animProps = useAnimatedProps(() => ({
    width: rate * progress.value + '%',
  }));
  return (
    <View
      style={{ width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' }}
    >
      <Svg width="100%" height={6}>
        <Defs>
          <LinearGradient id="progGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent} stopOpacity="1" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        <AnimatedRect
          x={0}
          y={0}
          width={0}
          height={6}
          rx={3}
          ry={3}
          fill="url(#progGrad)"
          animatedProps={animProps as any}
        />
      </Svg>
    </View>
  );
}

function GradientJourneyBar({
  progress,
  rate,
  accent,
}: {
  progress: SharedValue<number>;
  rate: number;
  accent: string;
}) {
  const animProps = useAnimatedProps(() => ({
    width: rate * progress.value + '%',
  }));
  return (
    <View
      style={{ width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' }}
    >
      <Svg width="100%" height={8}>
        <Defs>
          <LinearGradient id="journeyGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={accent} stopOpacity="1" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>
        <AnimatedRect
          x={0}
          y={0}
          width={0}
          height={8}
          rx={4}
          ry={4}
          fill="url(#journeyGrad)"
          animatedProps={animProps as any}
        />
      </Svg>
    </View>
  );
}

/* ─── Streak Section ─── */
function StreakSection({
  stats,
  cs,
  radii,
  entered,
}: {
  stats: StatsData;
  cs: any;
  radii: any;
  entered?: boolean;
}) {
  const p1 = useAnimateOnEnter(entered, 200);
  const p2 = useAnimateOnEnter(entered, 300);
  const p3 = useAnimateOnEnter(entered, 400);

  return (
    <Raised radius={radii.panel} distance={6} style={styles.streakContainer}>
      <Text style={[styles.sectionTitle, { color: cs.textPrimary }]}>
        Streak Analytics
      </Text>
      <View style={styles.streakRow}>
        <StatPill
          label="Best Streak"
          value={stats.overall.bestStreak}
          suffix="d"
          cs={cs}
          radii={radii}
          progress={p1}
        />
        <StatPill
          label="Avg Streak"
          value={stats.averageStreak}
          suffix="d"
          cs={cs}
          radii={radii}
          progress={p2}
        />
        <StatPill
          label="Broken"
          value={stats.streaksBroken}
          cs={cs}
          radii={radii}
          progress={p3}
        />
      </View>
    </Raised>
  );
}

function StatPill({
  label,
  value,
  suffix,
  cs,
  radii,
  progress,
}: {
  label: string;
  value: number;
  suffix?: string;
  cs: any;
  radii: any;
  progress: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));
  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Inset radius={radii.pill} style={styles.statPill}>
        <Text style={[styles.statPillValue, { color: cs.textPrimary }]}>
          {value}
          {suffix ?? ''}
        </Text>
        <Text style={[styles.statPillLabel, { color: cs.textMuted }]}>
          {label}
        </Text>
      </Inset>
    </Animated.View>
  );
}

/* ─── Habit Journey Card ─── */
function HabitJourneyCard({
  habit,
  cs,
  radii,
  entered,
  index,
}: {
  habit: HabitDetailStats;
  cs: any;
  radii: any;
  entered?: boolean;
  index: number;
}) {
  const progress = useAnimateOnEnter(entered, 400 + index * 100);
  const Icon = getHabitIcon(habit.icon);

  const slideInStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * 30 }],
  }));

  const completedPct = habit.completionRateAll;

  return (
    <View style={styles.journeyOuter}>
      <Animated.View style={slideInStyle}>
        <Raised radius={radii.panel} distance={5} style={styles.journeyCard}>
          <View style={styles.journeyTop}>
            <View
              style={[
                styles.journeyIconWrap,
                { backgroundColor: habit.color + '22' },
              ]}
            >
              <Icon size={20} color={habit.color} />
            </View>
            <View style={styles.journeyInfo}>
              <Text
                style={[styles.journeyName, { color: cs.textPrimary }]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              <Text style={[styles.journeyMeta, { color: cs.textMuted }]}>
                {habit.totalCompletions} done · {habit.totalMisses} missed
              </Text>
            </View>
            <Text style={[styles.journeyPct, { color: cs.accent }]}>
              {completedPct}%
            </Text>
          </View>

          {/* Timeline bar: gradient fill for completed portion */}
          <View
            style={[styles.journeyBar, { backgroundColor: cs.backgroundDeep }]}
          >
            <GradientJourneyBar
              progress={progress}
              rate={completedPct}
              accent={cs.accent}
            />
          </View>

          <View style={styles.journeyBottom}>
            <Text style={[styles.journeyMeta, { color: cs.textMuted }]}>
              Started {formatCreatedDate(habit.id)} · {habit.habitAge} days ago
            </Text>
          </View>
        </Raised>
      </Animated.View>
    </View>
  );
}

/** Look up the habit's createdAt from the store and format it */
function formatCreatedDate(habitId: string): string {
  const habits = useHabitStore.getState().habits;
  const h = habits.find(x => x.id === habitId);
  if (!h) return 'Unknown';
  const d = new Date(h.createdAt);
  return (
    MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
  );
}

/* ─── Insight Item ─── */
function InsightItem({
  insight,
  cs,
  radii,
}: {
  insight: { type: 'positive' | 'negative' | 'neutral'; text: string };
  cs: any;
  radii: any;
}) {
  const borderColor =
    insight.type === 'positive'
      ? cs.iosGreen
      : insight.type === 'negative'
      ? cs.iosRed
      : cs.accent;
  const icon =
    insight.type === 'positive' ? '✓' : insight.type === 'negative' ? '!' : '•';
  const iconColor =
    insight.type === 'positive'
      ? cs.iosGreen
      : insight.type === 'negative'
      ? cs.iosRed
      : cs.accent;

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
      <Raised
        radius={radii.panel}
        distance={4}
        style={[
          styles.insightCard,
          { borderLeftColor: borderColor, borderLeftWidth: 4 },
        ]}
      >
        <View style={styles.insightRow}>
          <Text style={[styles.insightIcon, { color: iconColor }]}>{icon}</Text>
          <Text style={[styles.insightText, { color: cs.textPrimary }]}>
            {insight.text}
          </Text>
        </View>
      </Raised>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backArrow: {
    fontSize: 22,
    marginRight: 4,
  },
  backText: { fontSize: 17 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 25,
    gap: 12,
  },
  summaryGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCardWrap: {
    flex: 1,
    minWidth: '45%',
  },
  summaryCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionTitleExt: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  sectionSubtitleExt: {
    fontSize: 12,
    marginBottom: 12,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
  chartHint: {
    fontSize: 11,
    marginTop: 10,
    lineHeight: 15,
  },
  hintRow: {
    fontSize: 11,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    marginBottom: 36,
  },
  streakContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 16,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statPillValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  habitRowOuter: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  habitCard: {
    padding: 14,
  },
  habitRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  habitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitRowInfo: {
    marginLeft: 10,
    flex: 1,
  },
  habitRowName: {
    fontSize: 15,
    fontWeight: '600',
  },
  habitRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  ringGradeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  habitRowRate: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarOuter: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: 6,
    borderRadius: 3,
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  habitMetaText: {
    fontSize: 11,
  },
  habitRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  insightCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIcon: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
    width: 18,
    textAlign: 'center',
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  trendArrow: {
    fontSize: 14,
  },
  journeyOuter: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  journeyCard: {
    padding: 14,
  },
  journeyTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyInfo: {
    marginLeft: 10,
    flex: 1,
  },
  journeyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  journeyMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  journeyPct: {
    fontSize: 18,
    fontWeight: '700',
  },
  journeyBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  journeyBarFill: {
    height: 8,
    borderRadius: 4,
  },
  journeyBottom: {
    marginTop: 6,
  },
  bottomSpacer: {
    height: 40,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 120,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
