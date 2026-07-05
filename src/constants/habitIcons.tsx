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
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CloudIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  CpuChipIcon,
  FaceSmileIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HomeIcon,
  LanguageIcon,
  LightBulbIcon,
  MapPinIcon,
  MegaphoneIcon,
  MicrophoneIcon,
  NewspaperIcon,
  PaintBrushIcon,
  PhoneIcon,
  PhotoIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SwatchIcon,
  TicketIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
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
  | 'camera'
  | 'clock'
  | 'calendar'
  | 'check'
  | 'checklist'
  | 'cloud'
  | 'settings'
  | 'computer'
  | 'cpu'
  | 'smile'
  | 'globe'
  | 'volunteer'
  | 'thumbs-up'
  | 'house'
  | 'language'
  | 'idea'
  | 'walk'
  | 'speech'
  | 'mic'
  | 'news'
  | 'paint'
  | 'call'
  | 'photo'
  | 'puzzle'
  | 'rocket'
  | 'scale'
  | 'grooming'
  | 'shield'
  | 'shopping-bag'
  | 'cart'
  | 'swatch'
  | 'ticket'
  | 'truck'
  | 'friends'
  | 'community';

export interface HabitIconOption {
  key: HabitIconKey;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}

export const HABIT_ICONS: HabitIconOption[] = [
  // Fitness / body
  { key: 'fire', Icon: FireIcon },
  { key: 'bolt', Icon: BoltIcon },
  { key: 'scale', Icon: ScaleIcon },
  { key: 'walk', Icon: MapPinIcon },
  { key: 'heart', Icon: HeartIcon },
  { key: 'grooming', Icon: ScissorsIcon },
  { key: 'no-smoking', Icon: NoSymbolIcon },

  // Health / mind
  { key: 'moon', Icon: MoonIcon },
  { key: 'sun', Icon: SunIcon },
  { key: 'beaker', Icon: BeakerIcon },
  { key: 'smile', Icon: FaceSmileIcon },
  { key: 'sparkles', Icon: SparklesIcon },
  { key: 'shield', Icon: ShieldCheckIcon },

  // Learning / productivity
  { key: 'book-open', Icon: BookOpenIcon },
  { key: 'study', Icon: AcademicCapIcon },
  { key: 'pencil', Icon: PencilSquareIcon },
  { key: 'checklist', Icon: ClipboardDocumentCheckIcon },
  { key: 'check', Icon: CheckCircleIcon },
  { key: 'clock', Icon: ClockIcon },
  { key: 'calendar', Icon: CalendarDaysIcon },
  { key: 'idea', Icon: LightBulbIcon },
  { key: 'language', Icon: LanguageIcon },
  { key: 'news', Icon: NewspaperIcon },
  { key: 'puzzle', Icon: PuzzlePieceIcon },
  { key: 'rocket', Icon: RocketLaunchIcon },
  { key: 'settings', Icon: Cog6ToothIcon },

  // Creative / hobby
  { key: 'music', Icon: MusicalNoteIcon },
  { key: 'mic', Icon: MicrophoneIcon },
  { key: 'camera', Icon: CameraIcon },
  { key: 'photo', Icon: PhotoIcon },
  { key: 'paint', Icon: PaintBrushIcon },
  { key: 'swatch', Icon: SwatchIcon },
  { key: 'ticket', Icon: TicketIcon },

  // Money / finance
  { key: 'money', Icon: CurrencyDollarIcon },
  { key: 'shopping-bag', Icon: ShoppingBagIcon },
  { key: 'cart', Icon: ShoppingCartIcon },

  // Social / lifestyle
  { key: 'friends', Icon: UserGroupIcon },
  { key: 'community', Icon: UsersIcon },
  { key: 'volunteer', Icon: HandRaisedIcon },
  { key: 'thumbs-up', Icon: HandThumbUpIcon },
  { key: 'speech', Icon: MegaphoneIcon },
  { key: 'call', Icon: PhoneIcon },
  { key: 'globe', Icon: GlobeAltIcon },
  { key: 'truck', Icon: TruckIcon },

  // Home / tech
  { key: 'home', Icon: HomeModernIcon },
  { key: 'house', Icon: HomeIcon },
  { key: 'cloud', Icon: CloudIcon },
  { key: 'computer', Icon: ComputerDesktopIcon },
  { key: 'cpu', Icon: CpuChipIcon },

  // Achievement
  { key: 'trophy', Icon: TrophyIcon },
];

/** Look up an icon component by its stored key, falling back to the fire
 * icon if the key is missing/unrecognized (e.g. old emoji data). */
export function getHabitIcon(key?: string): HabitIconOption['Icon'] {
  return HABIT_ICONS.find(i => i.key === key)?.Icon ?? FireIcon;
}

// import React from 'react';
// import {
//   FireIcon,
//   BookOpenIcon,
//   BeakerIcon,
//   HeartIcon,
//   MoonIcon,
//   PencilSquareIcon,
//   BoltIcon,
//   SparklesIcon,
//   MusicalNoteIcon,
//   CurrencyDollarIcon,
//   NoSymbolIcon,
//   SunIcon,
//   TrophyIcon,
//   AcademicCapIcon,
//   HomeModernIcon,
//   CameraIcon,
// } from 'react-native-heroicons/outline';

// export type HabitIconKey =
//   | 'fire'
//   | 'book-open'
//   | 'beaker'
//   | 'heart'
//   | 'moon'
//   | 'pencil'
//   | 'bolt'
//   | 'sparkles'
//   | 'music'
//   | 'money'
//   | 'no-smoking'
//   | 'sun'
//   | 'trophy'
//   | 'study'
//   | 'home'
//   | 'camera';

// export interface HabitIconOption {
//   key: HabitIconKey;
//   Icon: React.ComponentType<{ size?: number; color?: string }>;
// }

// export const HABIT_ICONS: HabitIconOption[] = [
//   { key: 'fire', Icon: FireIcon },
//   { key: 'book-open', Icon: BookOpenIcon },
//   { key: 'beaker', Icon: BeakerIcon },
//   { key: 'heart', Icon: HeartIcon },
//   { key: 'moon', Icon: MoonIcon },
//   { key: 'pencil', Icon: PencilSquareIcon },
//   { key: 'bolt', Icon: BoltIcon },
//   { key: 'sparkles', Icon: SparklesIcon },
//   { key: 'music', Icon: MusicalNoteIcon },
//   { key: 'money', Icon: CurrencyDollarIcon },
//   { key: 'no-smoking', Icon: NoSymbolIcon },
//   { key: 'sun', Icon: SunIcon },
//   { key: 'trophy', Icon: TrophyIcon },
//   { key: 'study', Icon: AcademicCapIcon },
//   { key: 'home', Icon: HomeModernIcon },
//   { key: 'camera', Icon: CameraIcon },
// ];

// /** Look up an icon component by its stored key, falling back to the fire
//  * icon if the key is missing/unrecognized (e.g. old emoji data). */
// export function getHabitIcon(key?: string): HabitIconOption['Icon'] {
//   return HABIT_ICONS.find(i => i.key === key)?.Icon ?? FireIcon;
// }
