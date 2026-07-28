import type { HabitCategory } from '../types/habit';

export const BUILT_IN_CATEGORIES: HabitCategory[] = [
  { key: 'none', name: 'None', icon: 'none', isCustom: false },
  { key: 'art', name: 'Art', icon: 'paint', isCustom: false },
  { key: 'finance', name: 'Finance', icon: 'money', isCustom: false },
  { key: 'fitness', name: 'Fitness', icon: 'bolt', isCustom: false },
  { key: 'health', name: 'Health', icon: 'heart', isCustom: false },
  { key: 'nutrition', name: 'Nutrition', icon: 'sun', isCustom: false },
  { key: 'study', name: 'Study', icon: 'study', isCustom: false },
  { key: 'social', name: 'Social', icon: 'friends', isCustom: false },
  { key: 'work', name: 'Work', icon: 'computer', isCustom: false },
  { key: 'other', name: 'Other', icon: 'sparkles', isCustom: false },
];

export function getCategoryKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

export function getCategoryIcon(key: string): string {
  if (key === 'none' || !key) return 'none';
  const builtIn = BUILT_IN_CATEGORIES.find(c => c.key === key);
  if (builtIn) return builtIn.icon;
  return 'sparkles';
}

export function getCategoryName(key: string): string {
  if (!key || key === 'none') return 'None';
  const builtIn = BUILT_IN_CATEGORIES.find(c => c.key === key);
  if (builtIn) return builtIn.name;
  return key;
}
