import { Habit } from '../types/habit';
import { toDateKey, addDays } from './dateUtils';

export interface OverallStats {
  totalHabits: number;
  totalCheckIns: number;
  currentStreak: number;
  bestStreak: number;
  overallCompletionRate: number;
  weekCompletionRate: number;
  monthCompletionRate: number;
  perfectDays: number;
  totalDaysTracked: number;
}

export interface HabitDetailStats {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentStreak: number;
  bestStreak: number;
  completionRateWeek: number;
  completionRateMonth: number;
  completionRateAll: number;
  totalCompletions: number;
  totalMisses: number;
  avgPerWeek: number;
  lastCompleted: string | null;
  habitAge: number;
  trend: 'improving' | 'declining' | 'stable';
  goal: string | undefined;
}

export interface WeeklyDataPoint {
  weekLabel: string;
  weekStart: string;
  count: number;
  total: number;
  rate: number;
}

export interface WeekdayBreakdown {
  day: string;
  rate: number;
  count: number;
  total: number;
}

export interface StreakEntry {
  start: string;
  end: string;
  length: number;
}

export interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
}

export interface StatsData {
  overall: OverallStats;
  habitStats: HabitDetailStats[];
  weeklyTrend: WeeklyDataPoint[];
  weekdayBreakdown: WeekdayBreakdown[];
  streakHistory: StreakEntry[];
  averageStreak: number;
  streaksBroken: number;
  bestHabit: HabitDetailStats | null;
  worstHabit: HabitDetailStats | null;
  insights: Insight[];
}

function getDateKeysInRange(days: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    keys.push(toDateKey(d));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

export function getHabitTrend(habit: Habit): 'improving' | 'declining' | 'stable' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let recent = 0;
  let previous = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -i);
    if (habit.completions[toDateKey(d)]) recent++;
  }
  for (let i = 7; i < 14; i++) {
    const d = addDays(today, -i);
    if (habit.completions[toDateKey(d)]) previous++;
  }
  if (recent > previous + 1) return 'improving';
  if (previous > recent + 1) return 'declining';
  return 'stable';
}

export function computeStreakHistory(habit: Habit): StreakEntry[] {
  const sorted = Object.keys(habit.completions)
    .filter(k => habit.completions[k])
    .sort();
  if (sorted.length === 0) return [];
  const streaks: StreakEntry[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const expected = toDateKey(addDays(new Date(prev + 'T00:00:00'), 1));
    if (sorted[i] === expected) {
      prev = sorted[i];
    } else {
      const len = new Date(prev + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime();
      streaks.push({ start, end: prev, length: Math.round(len / 86400000) + 1 });
      start = sorted[i];
      prev = sorted[i];
    }
  }
  const len = new Date(prev + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime();
  streaks.push({ start, end: prev, length: Math.round(len / 86400000) + 1 });
  return streaks;
}

export function computeCurrentStreak(habit: Habit): number {
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!habit.completions[toDateKey(cursor)]) {
    cursor = addDays(cursor, -1);
  }
  while (habit.completions[toDateKey(cursor)]) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeBestStreak(habit: Habit): number {
  const dates = Object.keys(habit.completions).filter(k => habit.completions[k]).sort();
  if (dates.length === 0) return 0;
  let best = 0;
  let running = 0;
  let prev: string | null = null;
  for (const key of dates) {
    if (prev && toDateKey(addDays(new Date(prev + 'T00:00:00'), 1)) === key) {
      running++;
    } else {
      running = 1;
    }
    best = Math.max(best, running);
    prev = key;
  }
  return best;
}

/** Generate all date-key strings from startDate (midnight) through today (inclusive). */
function getDateKeysFrom(startDate: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function computeStats(habits: Habit[]): StatsData {
  const active = habits.filter(h => !h.archived);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstHabitDate = active.length > 0
    ? new Date(Math.min(...active.map(h => new Date(h.createdAt).getTime())))
    : today;
  const totalDaysTracked = Math.max(1, Math.round((today.getTime() - firstHabitDate.getTime()) / 86400000) + 1);

  const last30Keys = getDateKeysInRange(30);
  const last7Keys = getDateKeysInRange(7);

  let totalCheckIns = 0;
  let perfectDays = 0;
  let overallTotal = 0;
  let weekCompleted = 0;
  let monthCompleted = 0;

  for (const h of active) {
    const keys = Object.keys(h.completions).filter(k => h.completions[k]);
    totalCheckIns += keys.length;
  }

  for (const key of last30Keys) {
    let completed = 0;
    for (const h of active) {
      if (h.completions[key]) completed++;
    }
    monthCompleted += completed;
    if (completed === active.length && active.length > 0) perfectDays++;
    overallTotal += active.length;
  }
  for (const key of last7Keys) {
    let completed = 0;
    for (const h of active) {
      if (h.completions[key]) completed++;
    }
    weekCompleted += completed;
  }

  const monthCompletionRate = overallTotal > 0 ? Math.round((monthCompleted / overallTotal) * 100) : 0;
  const weekCompletionRate = active.length * 7 > 0 ? Math.round((weekCompleted / (active.length * 7)) * 100) : 0;
  const overallRate = totalDaysTracked * active.length > 0
    ? Math.round((totalCheckIns / (totalDaysTracked * active.length)) * 100)
    : 0;

  let allCurrentStreaks = active.map(h => computeCurrentStreak(h));
  let allBestStreaks = active.map(h => computeBestStreak(h));

  const overall: OverallStats = {
    totalHabits: active.length,
    totalCheckIns,
    currentStreak: Math.max(...allCurrentStreaks, 0),
    bestStreak: Math.max(...allBestStreaks, 0),
    overallCompletionRate: overallRate,
    weekCompletionRate,
    monthCompletionRate,
    perfectDays,
    totalDaysTracked,
  };

  const habitStats: HabitDetailStats[] = active.map(h => {
    const dates = Object.keys(h.completions).filter(k => h.completions[k]);
    const sortedDates = dates.slice().sort();

    let weekComp = 0;
    let monthComp = 0;
    for (const key of last7Keys) { if (h.completions[key]) weekComp++; }
    for (const key of last30Keys) { if (h.completions[key]) monthComp++; }

    const lastCompleted = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    const createdDate = new Date(h.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    const allDateKeys = getDateKeysFrom(createdDate);
    const totalDays = allDateKeys.length;
    let missedCount = 0;
    for (const key of allDateKeys) {
      if (!h.completions[key]) missedCount++;
    }
    const totalMisses = missedCount;
    const totalCompletions = totalDays - totalMisses;
    const avgPerWeek = Math.round((totalCompletions / totalDays) * 7);
    const trend = getHabitTrend(h);
    const completionRateAll = Math.round((totalCompletions / totalDays) * 100);

    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      currentStreak: computeCurrentStreak(h),
      bestStreak: computeBestStreak(h),
      completionRateWeek: Math.round((weekComp / 7) * 100),
      completionRateMonth: Math.round((monthComp / 30) * 100),
      completionRateAll,
      totalCompletions,
      totalMisses,
      avgPerWeek,
      lastCompleted,
      habitAge: totalDays,
      trend,
      goal: h.goal,
    };
  });

  const weeklyTrend: WeeklyDataPoint[] = (() => {
    const points: WeeklyDataPoint[] = [];
    for (let w = 11; w >= 0; w--) {
      const weekStart = addDays(today, -(w * 7 + 6));
      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      let count = 0;
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const key = toDateKey(addDays(weekStart, d));
        for (const h of active) {
          if (h.completions[key]) count++;
          total++;
        }
      }
      points.push({
        weekLabel: label,
        weekStart: toDateKey(weekStart),
        count,
        total: Math.max(1, total),
        rate: Math.round((count / Math.max(1, total)) * 100),
      });
    }
    return points;
  })();

  const weekdayBreakdown: WeekdayBreakdown[] = (() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 90; i++) {
      const d = addDays(today, -i);
      const key = toDateKey(d);
      const dayOfWeek = d.getDay();
      totals[dayOfWeek] += active.length;
      for (const h of active) {
        if (h.completions[key]) counts[dayOfWeek]++;
      }
    }
    return dayNames.map((day, i) => ({
      day,
      count: counts[i],
      total: totals[i],
      rate: totals[i] > 0 ? Math.round((counts[i] / totals[i]) * 100) : 0,
    }));
  })();

  const allStreaks: StreakEntry[] = active.flatMap(h => computeStreakHistory(h));
  const streakLengths = allStreaks.map(s => s.length);
  const averageStreak = streakLengths.length > 0
    ? Math.round(streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length)
    : 0;
  const streaksBroken = Math.max(0, allStreaks.length - active.length);

  const sortedByRate = [...habitStats].sort((a, b) => b.completionRateAll - a.completionRateAll);
  const bestHabit = sortedByRate[0] ?? null;
  const worstHabit = sortedByRate[sortedByRate.length - 1] ?? null;

  const insights: Insight[] = [];
  if (bestHabit && worstHabit && bestHabit.id !== worstHabit.id) {
    insights.push({
      type: 'positive',
      text: `Best habit: "${bestHabit.name}" at ${bestHabit.completionRateAll}% completion`,
    });
    insights.push({
      type: 'negative',
      text: `Needs attention: "${worstHabit.name}" at ${worstHabit.completionRateAll}%`,
    });
  }
  if (overall.currentStreak >= 7) {
    insights.push({
      type: 'positive',
      text: `🔥 ${overall.currentStreak}-day streak! You're on fire!`,
    });
  }
  if (overall.perfectDays >= 5) {
    insights.push({
      type: 'positive',
      text: `${overall.perfectDays} perfect days — all habits completed!`,
    });
  }
  const bestWeekDay = [...weekdayBreakdown].sort((a, b) => b.rate - a.rate)[0];
  if (bestWeekDay && bestWeekDay.rate > 0) {
    insights.push({
      type: 'neutral',
      text: `Most consistent on ${bestWeekDay.day}s (${bestWeekDay.rate}%)`,
    });
  }
  const worstWeekDay = [...weekdayBreakdown].sort((a, b) => a.rate - b.rate)[0];
  if (worstWeekDay && worstWeekDay.rate > 0 && worstWeekDay.day !== bestWeekDay?.day) {
    insights.push({
      type: 'neutral',
      text: `${worstWeekDay.day}s need a boost (${worstWeekDay.rate}% completion)`,
    });
  }
  const trendingDown = habitStats.filter(h => h.trend === 'declining');
  if (trendingDown.length > 0) {
    insights.push({
      type: 'negative',
      text: `${trendingDown.length} habit${trendingDown.length > 1 ? 's' : ''} trending down this week`,
    });
  }
  const trendingUp = habitStats.filter(h => h.trend === 'improving');
  if (trendingUp.length > 0) {
    insights.push({
      type: 'positive',
      text: `${trendingUp.length} habit${trendingUp.length > 1 ? 's' : ''} improving this week!`,
    });
  }
  if (active.length === 0) {
    insights.push({
      type: 'neutral',
      text: 'Add some habits to see analytics and insights!',
    });
  }

  return {
    overall,
    habitStats,
    weeklyTrend,
    weekdayBreakdown,
    streakHistory: allStreaks,
    averageStreak,
    streaksBroken,
    bestHabit,
    worstHabit,
    insights,
  };
}
