import type { Goal } from '../types/goal';

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
