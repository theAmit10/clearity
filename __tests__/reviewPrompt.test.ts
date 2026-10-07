jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../src/services/logger', () => ({
  logEvent: jest.fn(),
}));

jest.mock('react-native-config', () => ({
  MIXPANEL_TOKEN: '',
  REVENUECAT_API_KEY: '',
}));

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn().mockResolvedValue(undefined),
  requestPermission: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  AndroidImportance: { HIGH: 'high' },
  EventType: { PRESS: 'press', ACTION_PRESS: 'action_press' },
  RepeatFrequency: { DAILY: 'daily' },
  TriggerType: { TIMESTAMP: 'timestamp' },
}));

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageCode: 'en', countryCode: 'US' }],
  getCalendars: () => [{ calendar: 'gregorian' }],
}));

jest.mock('react-native-store-review', () => ({
  requestReview: jest.fn(),
}));

import {
  shouldShowStreakReview,
  REVIEW_PROMPT_COOLDOWN_MS,
  REVIEW_PROMPT_MAX_COUNT,
  STREAK_REVIEW_TARGET,
} from '../src/services/reviewPrompt';
import { defaultReviewPromptState } from '../src/services/storage';

describe('shouldShowStreakReview (Option A: direct, daily-only, cross-once)', () => {
  it('fires only on exactly 5 for daily habits with fresh state', () => {
    expect(shouldShowStreakReview(defaultReviewPromptState(), 'daily', 5)).toBe(true);
    expect(shouldShowStreakReview(defaultReviewPromptState(), 'daily', 4)).toBe(false);
    expect(shouldShowStreakReview(defaultReviewPromptState(), 'daily', 6)).toBe(false);
  });

  it('ignores non-daily frequencies', () => {
    const fresh = defaultReviewPromptState();
    expect(shouldShowStreakReview(fresh, 'n_times_per_week', 5)).toBe(false);
    expect(shouldShowStreakReview(fresh, 'n_times_per_month', 5)).toBe(false);
    expect(shouldShowStreakReview(fresh, 'n_times_in_m_days', 5)).toBe(false);
  });

  it(`caps at ${REVIEW_PROMPT_MAX_COUNT} lifetime prompts`, () => {
    const capped = {
      ...defaultReviewPromptState(),
      promptCount: REVIEW_PROMPT_MAX_COUNT,
      lastPromptAt: new Date(2020, 0, 1).toISOString(),
    };
    expect(shouldShowStreakReview(capped, 'daily', STREAK_REVIEW_TARGET, Date.now())).toBe(false);
  });

  it('enforces the 90-day cooldown after any prior prompt', () => {
    const recent = {
      ...defaultReviewPromptState(),
      promptCount: 1,
      lastPromptAt: new Date().toISOString(),
    };
    expect(shouldShowStreakReview(recent, 'daily', 5)).toBe(false);

    const old = {
      ...defaultReviewPromptState(),
      promptCount: 1,
      lastPromptAt: new Date(Date.now() - REVIEW_PROMPT_COOLDOWN_MS - 1000).toISOString(),
    };
    expect(shouldShowStreakReview(old, 'daily', 5)).toBe(true);
  });
});
