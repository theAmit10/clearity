import { FREE_GOAL_LIMIT, FREE_HABIT_LIMIT } from '../constants/appInfo';
import type { Goal } from '../types/goal';
import type { Habit } from '../types/habit';

/**
 * Pro downgrade locks ("read-only lock extras").
 *
 * When Pro expires, the oldest habits/goals stay free and the rest become
 * locked: visible + deletable, but not checkable/editable/remindable.
 * Lock state is always computed from `createdAt` (never stored), so
 * deleting down to the free limit auto-promotes the next-oldest item and
 * renewing unlocks everything instantly. Archived habits don't count and
 * are never locked; reorder can't game the lock since it's date-based.
 */

function byCreatedAtAsc(
  a: { createdAt?: string },
  b: { createdAt?: string },
): number {
  return (
    new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  );
}

/** Ids of habits that stay interactive for free / expired users. */
export function getFreeHabitIds(habits: Habit[]): Set<string> {
  const active = habits.filter(
    h => !!h && typeof h.id === 'string' && !h.archived,
  );
  const free = [...active].sort(byCreatedAtAsc).slice(0, FREE_HABIT_LIMIT);
  return new Set(free.map(h => h.id));
}

/** Ids of habits locked behind Pro (over the free limit). */
export function getLockedHabitIds(habits: Habit[]): Set<string> {
  const free = getFreeHabitIds(habits);
  const locked = new Set<string>();
  for (const h of habits) {
    if (!h || typeof h.id !== 'string' || h.archived) continue;
    if (!free.has(h.id)) locked.add(h.id);
  }
  return locked;
}

/** Ids of goals that stay interactive for free / expired users. */
export function getFreeGoalIds(goals: Goal[]): Set<string> {
  const valid = goals.filter(g => !!g && typeof g.id === 'string');
  const free = [...valid].sort(byCreatedAtAsc).slice(0, FREE_GOAL_LIMIT);
  return new Set(free.map(g => g.id));
}

/** Ids of goals locked behind Pro (over the free limit). */
export function getLockedGoalIds(goals: Goal[]): Set<string> {
  const free = getFreeGoalIds(goals);
  const locked = new Set<string>();
  for (const g of goals) {
    if (!g || typeof g.id !== 'string') continue;
    if (!free.has(g.id)) locked.add(g.id);
  }
  return locked;
}
