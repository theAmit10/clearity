import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_KEY = '@habit_tracker/habits';
const LOGS_KEY = '@habit_tracker/logs';
const REVIEW_KEY = '@habit_tracker/review';
const NOTIFICATIONS_KEY = '@habit_tracker/notifications';
const GENERAL_KEY = '@habit_tracker/general';
const CUSTOM_CATEGORIES_KEY = '@habit_tracker/custom_categories';
const GOALS_KEY = '@habit_tracker/goals';
const GOAL_NOTIFICATIONS_KEY = '@habit_tracker/goal_notifications';
const ONBOARDING_KEY = '@habit_tracker/onboarding_seen';

export async function loadGoals<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveGoals(data: unknown): Promise<void> {
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(data));
}

export async function loadGoalNotifications<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(GOAL_NOTIFICATIONS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveGoalNotifications(data: unknown): Promise<void> {
  await AsyncStorage.setItem(GOAL_NOTIFICATIONS_KEY, JSON.stringify(data));
}

export async function loadHabits<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(HABITS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveHabits(data: unknown): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(data));
}

export async function loadLogs<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(LOGS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveLogs(data: unknown): Promise<void> {
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(data));
}

export async function loadReviewState(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(REVIEW_KEY);
  return raw === 'true';
}

export async function saveReviewState(shown: boolean): Promise<void> {
  await AsyncStorage.setItem(REVIEW_KEY, shown ? 'true' : 'false');
}

export async function loadNotificationData<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveNotificationData(data: unknown): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data));
}

export interface GeneralSettings {
  showCategories: boolean;
  showStreaks: boolean;
  showCategoryBadges: boolean;
  showFrequency: boolean;
  crashlyticsEnabled: boolean;
}

export async function loadGeneralSettings(): Promise<GeneralSettings | null> {
  const raw = await AsyncStorage.getItem(GENERAL_KEY);
  return raw ? (JSON.parse(raw) as GeneralSettings) : null;
}

export async function saveGeneralSettings(data: GeneralSettings): Promise<void> {
  await AsyncStorage.setItem(GENERAL_KEY, JSON.stringify(data));
}

export async function loadCustomCategories<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveCustomCategories(data: unknown): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(data));
}

export async function loadOnboardingSeen(): Promise<boolean | null> {
  const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  if (raw == null) return null;
  return raw === 'true';
}

export async function saveOnboardingSeen(seen: boolean): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, seen ? 'true' : 'false');
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([HABITS_KEY, LOGS_KEY, REVIEW_KEY, NOTIFICATIONS_KEY, GENERAL_KEY, CUSTOM_CATEGORIES_KEY, GOALS_KEY, GOAL_NOTIFICATIONS_KEY, ONBOARDING_KEY]);
}
