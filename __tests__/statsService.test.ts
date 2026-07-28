/**
 * Tests for statsService.ts
 *
 * All tests use a fixed "today" of 2026-07-27 via jest.useFakeTimers.
 * Habit fixtures are constructed with known completion patterns so every
 * derived metric can be verified by hand.
 */

jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
}));

import { Habit } from '../src/types/habit';
import {
  computeStats,
  computeCurrentStreak,
  computeBestStreak,
  getHabitTrend,
  computeStreakHistory,
  type StatsData,
} from '../src/services/statsService';

const TODAY = '2026-07-27';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Test Habit',
    icon: '💪',
    color: '#FF5733',
    frequency: 'daily',
    createdAt: '2026-07-01T00:00:00.000Z',
    archived: false,
    completions: {},
    ...overrides,
  };
}

/** Return a date string N days before TODAY */
function daysAgo(n: number): string {
  const d = new Date(TODAY + 'T00:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mark a habit as completed on a range of dates [startDaysAgo, endDaysAgo] */
function completeRange(habit: Habit, startDaysAgo: number, endDaysAgo: number): Habit {
  const c = { ...habit.completions };
  for (let i = startDaysAgo; i <= endDaysAgo; i++) {
    c[daysAgo(i)] = 1;
  }
  return { ...habit, completions: c };
}

/** Mark a habit as completed on specific days-ago offsets */
function completeOn(habit: Habit, ...daysAgoOffsets: number[]): Habit {
  const c = { ...habit.completions };
  for (const offset of daysAgoOffsets) {
    c[daysAgo(offset)] = 1;
  }
  return { ...habit, completions: c };
}

beforeAll(() => {
  jest.useFakeTimers({ now: new Date(TODAY + 'T00:00:00.000Z') });
});

afterAll(() => {
  jest.useRealTimers();
});

/* ─── helpers ─── */

describe('computeCurrentStreak', () => {
  it('returns 0 for a habit with no completions', () => {
    const h = makeHabit();
    expect(computeCurrentStreak(h)).toBe(0);
  });

  it('returns 1 if only today is completed', () => {
    const h = completeOn(makeHabit(), 0);
    expect(computeCurrentStreak(h)).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    const h = completeRange(makeHabit({ createdAt: daysAgo(14) + 'T00:00:00.000Z' }), 0, 4);
    expect(computeCurrentStreak(h)).toBe(5);
  });

  it('stops counting at a gap (today not completed, yesterday is)', () => {
    const h = completeRange(makeHabit({ createdAt: daysAgo(14) + 'T00:00:00.000Z' }), 1, 4);
    expect(computeCurrentStreak(h)).toBe(4);
  });

  it('handles gap in the middle', () => {
    const h = completeOn(makeHabit({ createdAt: daysAgo(14) + 'T00:00:00.000Z' }), 0, 1, 2, 4, 5);
    // today(0), yesterday(1), dayBefore(2) are consecutive => streak 3
    expect(computeCurrentStreak(h)).toBe(3);
  });
});

describe('computeBestStreak', () => {
  it('returns 0 for no completions', () => {
    expect(computeBestStreak(makeHabit())).toBe(0);
  });

  it('returns 1 for a single completion', () => {
    const h = completeOn(makeHabit(), 5);
    expect(computeBestStreak(h)).toBe(1);
  });

  it('finds the longest consecutive run', () => {
    // completions on days 1,2,3 (streak 3) and 6,7,8,9 (streak 4)
    const h = completeOn(makeHabit({ createdAt: daysAgo(20) + 'T00:00:00.000Z' }), 1, 2, 3, 6, 7, 8, 9);
    expect(computeBestStreak(h)).toBe(4);
  });
});

describe('getHabitTrend', () => {
  it('returns stable when no data', () => {
    expect(getHabitTrend(makeHabit())).toBe('stable');
  });

  it('returns improving when last 7d > prior 7d + 1', () => {
    // 5 completions in last 7 days, 2 in the prior 7
    const h = completeOn(
      makeHabit({ createdAt: daysAgo(30) + 'T00:00:00.000Z' }),
      0, 1, 2, 3, 4, // last 7d: 5
      8, 9,           // prior 7d: 2 (days 7-13)
    );
    expect(getHabitTrend(h)).toBe('improving');
  });

  it('returns declining when prior 7d > last 7d + 1', () => {
    const h = completeOn(
      makeHabit({ createdAt: daysAgo(30) + 'T00:00:00.000Z' }),
      0, 1,       // last 7d: 2
      8, 9, 10, 11, // prior 7d: 4 > 2 + 1 → declining
    );
    expect(getHabitTrend(h)).toBe('declining');
  });

  it('returns stable when difference ≤ 1', () => {
    const h = completeOn(
      makeHabit({ createdAt: daysAgo(30) + 'T00:00:00.000Z' }),
      0, 1,    // last 7d: 2
      8,       // prior 7d: 1
    );
    expect(getHabitTrend(h)).toBe('stable');
  });
});

describe('computeStreakHistory', () => {
  it('returns empty for no completions', () => {
    expect(computeStreakHistory(makeHabit())).toEqual([]);
  });

  it('detects a single streak', () => {
    const h = completeRange(makeHabit({ createdAt: daysAgo(10) + 'T00:00:00.000Z' }), 1, 3);
    const streaks = computeStreakHistory(h);
    expect(streaks).toHaveLength(1);
    expect(streaks[0].length).toBe(3);
  });

  it('detects multiple streaks separated by gaps', () => {
    // daysAgo(7,6,5) = 3-day streak; daysAgo(2,1) = 2-day streak
    const h = completeOn(makeHabit({ createdAt: daysAgo(20) + 'T00:00:00.000Z' }), 1, 2, 5, 6, 7);
    const streaks = computeStreakHistory(h);
    expect(streaks).toHaveLength(2);
    expect(streaks[0].length).toBe(3); // earlier streak (days 5,6,7)
    expect(streaks[1].length).toBe(2); // later streak  (days 1,2)
  });
});

/* ─── computeStats ─── */

describe('computeStats', () => {
  it('returns zeros when no habits exist', () => {
    const stats = computeStats([]);
    expect(stats.overall.totalHabits).toBe(0);
    expect(stats.overall.totalCheckIns).toBe(0);
    expect(stats.overall.currentStreak).toBe(0);
    expect(stats.overall.bestStreak).toBe(0);
    expect(stats.habitStats).toEqual([]);
    expect(stats.weeklyTrend).toHaveLength(12);
    expect(stats.insights.length).toBeGreaterThan(0);
  });

  it('computes totals for a single habit completed every day', () => {
    // created July 1, today July 27 → 27 calendar days (inclusive)
    const h = completeRange(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 26, // 27 completions (all calendar days)
    );
    const stats = computeStats([h]);

    expect(stats.overall.totalHabits).toBe(1);
    expect(stats.overall.totalCheckIns).toBe(27);
    expect(stats.overall.bestStreak).toBe(27);

    expect(stats.habitStats[0].totalCompletions).toBe(27);
    expect(stats.habitStats[0].completionRateAll).toBe(100);
    expect(stats.habitStats[0].totalMisses).toBe(0);
  });

  it('computes missed days correctly', () => {
    const h = completeOn(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 1, 2, 5, 6, 10,
    );
    const stats = computeStats([h]);
    // 27 calendar days (July 1 → July 27 inclusive)
    // 6 completed → missed = 27 - 6 = 21
    expect(stats.habitStats[0].totalCompletions).toBe(6);
    expect(stats.habitStats[0].totalMisses).toBe(21);
    expect(stats.habitStats[0].completionRateAll).toBe(Math.round((6 / 27) * 100));
  });

  it('computes avgPerWeek correctly', () => {
    const h = completeOn(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 1, 2, 3, 4, 5, 6,
    );
    const stats = computeStats([h]);
    // 7 completions / 27 days * 7 ≈ 1.81 → 2
    expect(stats.habitStats[0].avgPerWeek).toBe(2);
  });

  it('computes weekCompletionRate for last 7 days', () => {
    // Complete every day in last 7 days
    const h = completeRange(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 6,
    );
    const stats = computeStats([h]);
    // 7 completions / (1 habit * 7) = 100%
    expect(stats.overall.weekCompletionRate).toBe(100);
  });

  it('computes monthCompletionRate for last 30 days', () => {
    // Complete all 27 days of habit life (within last 30)
    const h = completeRange(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 26,
    );
    const stats = computeStats([h]);
    // 27 completions / (1 habit * 30) = 90%
    expect(stats.overall.monthCompletionRate).toBe(90);
  });

  it('counts perfect days when all habits completed', () => {
    const h1 = completeOn(
      makeHabit({ id: 'a', name: 'A', createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 1, 2,
    );
    const h2 = completeOn(
      makeHabit({ id: 'b', name: 'B', createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 1, 2,
    );
    const stats = computeStats([h1, h2]);
    // days 0,1,2 have both habits => 3 perfect days
    expect(stats.overall.perfectDays).toBe(3);
  });

  it('weeklyTrend has 12 data points with correct rates', () => {
    const h = completeRange(
      makeHabit({ createdAt: '2026-01-01T00:00:00.000Z' }),
      0, 6,
    );
    const stats = computeStats([h]);
    expect(stats.weeklyTrend).toHaveLength(12);
    // Most recent week (days 0-6) should have 7 completions / 7 total = 100%
    expect(stats.weeklyTrend[11].rate).toBe(100);
    // Older weeks have 0
    expect(stats.weeklyTrend[10].rate).toBe(0);
  });

  it('weekdayBreakdown has 7 entries', () => {
    const h = completeRange(
      makeHabit({ createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 6,
    );
    const stats = computeStats([h]);
    expect(stats.weekdayBreakdown).toHaveLength(7);
    expect(stats.weekdayBreakdown.map(d => d.day)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });

  it('identifies best and worst habit', () => {
    const h1 = completeOn(
      makeHabit({ id: 'a', name: 'Good', createdAt: '2026-07-01T00:00:00.000Z' }),
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
    );
    const h2 = completeOn(
      makeHabit({ id: 'b', name: 'Bad', createdAt: '2026-07-01T00:00:00.000Z' }),
      0,
    );
    const stats = computeStats([h1, h2]);
    expect(stats.bestHabit?.name).toBe('Good');
    expect(stats.worstHabit?.name).toBe('Bad');
  });

  it('detects streaksBroken correctly', () => {
    // Streak: complete days 1-5, gap, complete days 10-12 => 2 streaks, 1 broken
    // Total habits = 1, streaks = 2 => broken = 2 - 1 = 1
    const h = completeOn(
      makeHabit({ createdAt: daysAgo(20) + 'T00:00:00.000Z' }),
      1, 2, 3, 4, 5,
      10, 11, 12,
    );
    const stats = computeStats([h]);
    expect(stats.streaksBroken).toBe(1);
  });

  it('generates insights based on data', () => {
    const h = completeOn(
      makeHabit({ createdAt: daysAgo(30) + 'T00:00:00.000Z' }),
      0, 1, 2, 3, 4, 5, 6, // current streak >= 7
    );
    const stats = computeStats([h]);
    expect(stats.insights.some(i => i.type === 'positive' && i.text.includes('streak'))).toBe(true);
  });
});
