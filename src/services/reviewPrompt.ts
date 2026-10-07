import { AppState } from 'react-native';
import { requestReview } from 'react-native-store-review';
import type { Habit } from '../types/habit';
import type { ReviewPromptState } from './storage';
import { defaultReviewPromptState } from './storage';
import { useHabitStore } from '../store/habitStore';
import { computeCurrentStreak } from './statsService';
import { todayKey } from './dateUtils';
import { trackEvent } from './analytics';
import { logEvent } from './logger';

// Direct (Option A) in-app review policy: ask once when a daily habit
// crosses exactly a 5-day streak on today's check-in. OS sheet is already
// gentle + quota-capped, so our job is to never double-prompt.
export const STREAK_REVIEW_TARGET = 5;
export const REVIEW_PROMPT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
export const REVIEW_PROMPT_MAX_COUNT = 2;

// Delay so the checkbox/celebration finishes before the OS sheet appears.
export const STREAK_REVIEW_DELAY_MS = 1200;

// Session guard — one attempt per foreground session even if two habits
// hit 5 on the same day.
let promptedThisSession = false;

export function resetReviewPromptSession(): void {
  promptedThisSession = false;
}

export function shouldShowStreakReview(
  state: ReviewPromptState | null | undefined,
  frequency: Habit['frequency'],
  newStreak: number,
  now: number = Date.now(),
): boolean {
  // Daily-only: streaks are meaningless for n_times_per_week/month windows.
  if (frequency !== 'daily') return false;
  // Fire only on the crossing (4 -> 5), never every day >= 5.
  if (newStreak !== STREAK_REVIEW_TARGET) return false;
  const s = state ?? defaultReviewPromptState();
  if (s.promptCount >= REVIEW_PROMPT_MAX_COUNT) return false;
  if (s.lastPromptAt) {
    const last = new Date(s.lastPromptAt).getTime();
    if (Number.isFinite(last) && now - last < REVIEW_PROMPT_COOLDOWN_MS) return false;
  }
  return true;
}

/**
 * Check eligibility and, if eligible, persist FIRST (survives kill/double-tap)
 * then show the OS review sheet. Returns true when the sheet was attempted.
 * Safe to call from any today-completion handler — no-ops on uncheck,
 * past-date edits, non-daily habits, background state, or repeat calls.
 */
export async function maybeRequestStreakReview(
  habitId: string,
  dateKey?: string,
): Promise<boolean> {
  try {
    // Only today's check-in qualifies — calendar past-date edits, widget
    // absolute-value syncs, imports/merges never flow through here.
    if ((dateKey ?? todayKey()) !== todayKey()) return false;
    if (promptedThisSession) return false;
    if (AppState.currentState !== 'active') return false;

    const store = useHabitStore.getState();
    const habit = store.habits.find(h => h.id === habitId);
    if (!habit || habit.archived) return false;
    // Must still be completed today (user may have unchecked during the delay).
    if (!habit.completions[todayKey()]) return false;

    const newStreak = computeCurrentStreak(habit);
    if (!shouldShowStreakReview(store.reviewPrompt, habit.frequency, newStreak)) return false;

    promptedThisSession = true;
    // Persist before the OS call so a kill/double-tap can't double-count.
    // markStreakPromptShown is idempotent w.r.t. counting (cap-guarded).
    await store.markStreakPromptShown();
    logEvent('info', 'In-app review requested (streak)', { streak: newStreak });
    trackEvent('review_prompt_shown', { streak: newStreak, trigger: 'streak_5' });
    try {
      requestReview();
    } catch (e) {
      logEvent('error', 'In-app review failed (streak)', e);
    }
    return true;
  } catch (e) {
    logEvent('error', 'Streak review check failed', e);
    return false;
  }
}
