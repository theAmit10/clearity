import type { Goal } from '../types/goal';
import type { TranslationKey } from '../i18n';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  overdueMs: number;
  remainingMs: number;
}

export function getCountdownParts(endAt: string, now: number = Date.now()): CountdownParts {
  const end = new Date(endAt).getTime();
  const diff = end - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, overdueMs: -diff, remainingMs: 0 };
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, expired: false, overdueMs: 0, remainingMs: diff };
}

export function isGoalExpired(goal: Goal, now: number = Date.now()): boolean {
  return goal.status === 'active' && new Date(goal.endAt).getTime() <= now;
}

export function formatOverdue(overdueMs: number): string {
  const totalSec = Math.floor(overdueMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h overdue`;
  if (hours > 0) return `${hours}h ${minutes}m overdue`;
  return `${minutes}m overdue`;
}

export function getTimeTaken(goal: Goal): string {
  const end = goal.completedAt ? new Date(goal.completedAt).getTime() : Date.now();
  const start = new Date(goal.startAt).getTime();
  const diff = Math.max(0, end - start);
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getProgress(goal: Goal, now: number = Date.now()): number {
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.endAt).getTime();
  if (end <= start) return 1;
  const clamped = Math.min(Math.max(now, start), end);
  return (clamped - start) / (end - start);
}

export type GoalVerdict = 'early' | 'on_time' | 'late';

export interface GoalCompletionStats {
  takenMs: number;
  allottedMs: number;
  /** completedAt - endAt. Positive = finished late, negative = early. */
  delayMs: number;
  /** allotted / taken * 100. Above 100 means the clock was beaten. */
  efficiencyPct: number;
  /** taken / allotted * 100. Above 100 means overtime. */
  usedPct: number;
  verdict: GoalVerdict;
}

const ON_TIME_WINDOW_MS = 3600_000;

/** In-depth stats for a completed goal. When completedAt is missing
 * (shouldn't happen for completed goals) it falls back to now. */
export function getGoalCompletionStats(goal: Pick<Goal, 'startAt' | 'endAt' | 'completedAt'>): GoalCompletionStats {
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.endAt).getTime();
  const done = goal.completedAt ? new Date(goal.completedAt).getTime() : Date.now();
  const takenMs = Math.max(0, done - start);
  const allottedMs = Math.max(0, end - start);
  const delayMs = done - end;
  const efficiencyPct = takenMs > 0 ? (allottedMs / takenMs) * 100 : 100;
  const usedPct = allottedMs > 0 ? (takenMs / allottedMs) * 100 : 100;
  const verdict: GoalVerdict =
    delayMs > 0 ? 'late' : delayMs >= -ON_TIME_WINDOW_MS ? 'on_time' : 'early';
  return { takenMs, allottedMs, delayMs, efficiencyPct, usedPct, verdict };
}

/** Human duration for analytics, e.g. "2d 4h", "3h 12m", "45m", "30s". */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export type DurationUnit = 'm' | 'h' | 'd';

/** Pick an integer-friendly unit for a duration chip so short spans
 * don't get crushed by hour rounding (e.g. 29 min must show "29m",
 * never "1h"). Zero stays zero. */
export function fitDurationUnit(ms: number): { value: number; suffix: DurationUnit } {
  const abs = Math.abs(ms);
  if (abs === 0) return { value: 0, suffix: 'm' };
  if (abs < 3600_000) return { value: Math.max(1, Math.round(abs / 60_000)), suffix: 'm' };
  if (abs < 48 * 3600_000) return { value: Math.round(abs / 3600_000), suffix: 'h' };
  return { value: Math.round(abs / 86400_000), suffix: 'd' };
}

export interface TimelineBounds {
  created: number;
  start: number;
  end: number;
  done: number;
  /** Left edge of the timeline: whichever came first, creation or start. */
  t0: number;
  /** Right edge: whichever came last, deadline or finish. */
  t1: number;
}

/** Epoch timestamps bounding the Created → Finished timeline. */
export function getTimelineBounds(
  goal: Pick<Goal, 'createdAt' | 'startAt' | 'endAt'> & { completedAt?: string },
  now: number = Date.now(),
): TimelineBounds {
  const created = new Date(goal.createdAt).getTime();
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.endAt).getTime();
  const done = goal.completedAt ? new Date(goal.completedAt).getTime() : now;
  const t0 = Math.min(created, start);
  const t1 = Math.max(end, done, t0 + 1);
  return { created, start, end, done, t0, t1 };
}

/** Position of a timestamp on [t0, t1] as 0-100, clamped. Powers the
 * milestone pill rings. */
export function milestonePercent(ms: number, t0: number, t1: number): number {
  if (t1 <= t0) return 100;
  return Math.min(100, Math.max(0, ((ms - t0) / (t1 - t0)) * 100));
}

export type LiveZone = 'on_track' | 'halfway' | 'danger' | 'overdue';

export interface LiveGoalStats {
  /** Elapsed share of the allowance, clamped 0-100. */
  elapsedPct: number;
  /** end - now. Negative when overdue. */
  remainingMs: number;
  zone: LiveZone;
  halfwayAt: number;
  almostDueAt: number;
  halfwayReached: boolean;
  almostDueReached: boolean;
  /** 1-based day number within the allowance (clamped). */
  dayCurrent: number;
  /** Total allowance days (min 1). */
  dayTotal: number;
}

const DAY_MS = 86400_000;

/** Live progress snapshot for an active goal. Pure function of the goal
 * and now, so the detail screen can recompute it on every countdown tick. */
export function getLiveGoalStats(
  goal: Pick<Goal, 'startAt' | 'endAt'>,
  now: number = Date.now(),
): LiveGoalStats {
  const start = new Date(goal.startAt).getTime();
  const end = new Date(goal.endAt).getTime();
  const span = Math.max(0, end - start);
  const halfwayAt = start + span * 0.5;
  const almostDueAt = start + span * 0.95;
  const remainingMs = end - now;
  const elapsedPct =
    span > 0 ? Math.min(100, Math.max(0, ((now - start) / span) * 100)) : 100;
  const zone: LiveZone =
    remainingMs <= 0
      ? 'overdue'
      : elapsedPct >= 95
        ? 'danger'
        : elapsedPct >= 50
          ? 'halfway'
          : 'on_track';
  const dayTotal = Math.max(1, Math.ceil(span / DAY_MS));
  const dayCurrent = Math.min(dayTotal, Math.max(1, Math.floor((now - start) / DAY_MS) + 1));
  return {
    elapsedPct,
    remainingMs,
    zone,
    halfwayAt,
    almostDueAt,
    halfwayReached: now >= halfwayAt,
    almostDueReached: now >= almostDueAt,
    dayCurrent,
    dayTotal,
  };
}

/** Banner headline per pace zone. Pure mapping so copy stays unit-testable. */
export const ZONE_COPY_KEY: Record<LiveZone, TranslationKey> = {
  on_track: 'goals.live.onTrackMsg',
  halfway: 'goals.live.pastHalfwayMsg',
  danger: 'goals.live.almostOutMsg',
  overdue: 'goals.live.overdueMsg',
};
