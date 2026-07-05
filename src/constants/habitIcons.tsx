import React from 'react';
import {
  FireIcon,
  BookOpenIcon,
  BeakerIcon,
  HeartIcon,
  MoonIcon,
  PencilSquareIcon,
  BoltIcon,
  SparklesIcon,
  MusicalNoteIcon,
  CurrencyDollarIcon,
  NoSymbolIcon,
  SunIcon,
  TrophyIcon,
  AcademicCapIcon,
  HomeModernIcon,
  CameraIcon,
} from 'react-native-heroicons/outline';

export type HabitIconKey =
  | 'fire'
  | 'book-open'
  | 'beaker'
  | 'heart'
  | 'moon'
  | 'pencil'
  | 'bolt'
  | 'sparkles'
  | 'music'
  | 'money'
  | 'no-smoking'
  | 'sun'
  | 'trophy'
  | 'study'
  | 'home'
  | 'camera';

export interface HabitIconOption {
  key: HabitIconKey;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}

export const HABIT_ICONS: HabitIconOption[] = [
  { key: 'fire', Icon: FireIcon },
  { key: 'book-open', Icon: BookOpenIcon },
  { key: 'beaker', Icon: BeakerIcon },
  { key: 'heart', Icon: HeartIcon },
  { key: 'moon', Icon: MoonIcon },
  { key: 'pencil', Icon: PencilSquareIcon },
  { key: 'bolt', Icon: BoltIcon },
  { key: 'sparkles', Icon: SparklesIcon },
  { key: 'music', Icon: MusicalNoteIcon },
  { key: 'money', Icon: CurrencyDollarIcon },
  { key: 'no-smoking', Icon: NoSymbolIcon },
  { key: 'sun', Icon: SunIcon },
  { key: 'trophy', Icon: TrophyIcon },
  { key: 'study', Icon: AcademicCapIcon },
  { key: 'home', Icon: HomeModernIcon },
  { key: 'camera', Icon: CameraIcon },
];

/** Look up an icon component by its stored key, falling back to the fire
 * icon if the key is missing/unrecognized (e.g. old emoji data). */
export function getHabitIcon(key?: string): HabitIconOption['Icon'] {
  return HABIT_ICONS.find(i => i.key === key)?.Icon ?? FireIcon;
}
