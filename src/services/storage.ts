import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_KEY = '@habit_tracker/habits';
const LOGS_KEY = '@habit_tracker/logs';
const REVIEW_KEY = '@habit_tracker/review';
const NOTIFICATIONS_KEY = '@habit_tracker/notifications';

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

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([HABITS_KEY, LOGS_KEY, REVIEW_KEY, NOTIFICATIONS_KEY]);
}
