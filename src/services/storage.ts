import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_KEY = '@habit_tracker/habits';
const LOGS_KEY = '@habit_tracker/logs';

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

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove([HABITS_KEY, LOGS_KEY]);
}
