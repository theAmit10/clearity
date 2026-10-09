import { useGoalStore } from '../store/goalStore';
import { useHabitStore } from '../store/habitStore';
import { logEvent } from './logger';
import {
  cancelGoalNotification,
  cancelHabitNotification,
  rescheduleAll,
} from './notification';
import { getLockedGoalIds, getLockedHabitIds } from './proAccess';

/**
 * Pro downgrade reminder handling ("suspend extras").
 *
 * When Pro expires, scheduled notifications for Pro-locked habits/goals are
 * cancelled. Their configs are kept with `enabled` untouched, so renewing
 * reschedules them with zero data loss and nothing is ever force-deleted.
 * Free (never-Pro) users have no locked items with live schedules — the
 * launch path filters them instead (see App.tsx) — so this is a no-op there.
 */

/** Cancel live schedules for Pro-locked habits/goals. No-op for Pro. */
export async function suspendLockedReminders(): Promise<void> {
  const { habits, habitNotifications, isPro } = useHabitStore.getState();
  const { goals, goalNotifications } = useGoalStore.getState();
  if (isPro) return;
  const lockedHabits = getLockedHabitIds(habits);
  const lockedGoals = getLockedGoalIds(goals);
  if (lockedHabits.size === 0 && lockedGoals.size === 0) return;
  const habitIds = habitNotifications
    .filter(n => lockedHabits.has(n.habitId))
    .map(n => n.id);
  const goalIds = goalNotifications
    .filter(n => lockedGoals.has(n.goalId))
    .map(n => n.id);
  await Promise.all([
    ...habitIds.map(id => cancelHabitNotification(id)),
    ...goalIds.map(id => cancelGoalNotification(id)),
  ]);
  logEvent('info', 'Locked reminders suspended', {
    habits: habitIds.length,
    goals: goalIds.length,
  });
}

/**
 * Re-schedule every enabled reminder (used on renew — everything is
 * unlocked again). NOTE: rescheduleAll cancels every pending notification,
 * so offer-reminder sync must happen after (it is Pro-gated off anyway).
 */
export async function rescheduleUnlockedReminders(): Promise<void> {
  const { habitNotifications, adminNotifications } =
    useHabitStore.getState();
  await rescheduleAll(habitNotifications, adminNotifications);
  await useGoalStore.getState().rescheduleActive();
  logEvent('info', 'Reminders rescheduled after renew');
}
