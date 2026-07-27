export type ThemeName = 'light' | 'dark' | 'blue' | 'gold' | 'pink' | 'green' | 'gray' | 'purple';

export interface ThemeColors {
  background: string;
  backgroundDeep: string;
  surface: string;
  insetFill: string;
  shadowLight: string;
  shadowDark: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  insetBorderDark: string;
  insetBorderLight: string;
  iosBg: string;
  iosSeparator: string;
  iosBlue: string;
  iosRed: string;
  iosGreen: string;
  iosGray: string;
  iosLabel: string;
  iosSecondaryLabel: string;
}

export interface Theme {
  name: ThemeName;
  label: string;
  colors: ThemeColors;
  radii: {
    card: number;
    panel: number;
    pill: number;
    iconBtn: number;
    dayBtn: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    title: { fontWeight: '700'; fontSize: number; letterSpacing: number };
    subtitle: { fontWeight: '500'; fontSize: number };
    label: { fontWeight: '700'; fontSize: number };
    dayNumber: { fontWeight: '700'; fontSize: number };
  };
  isDark: boolean;
}

const radii = {
  card: 28,
  panel: 18,
  pill: 16,
  iconBtn: 14,
  dayBtn: 999,
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
};

const typography = {
  title: { fontWeight: '700' as const, fontSize: 21, letterSpacing: -0.2 },
  subtitle: { fontWeight: '500' as const, fontSize: 13 },
  label: { fontWeight: '700' as const, fontSize: 12 },
  dayNumber: { fontWeight: '700' as const, fontSize: 14 },
};

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: 'light',
    label: 'White Neumorphic',
    colors: {
      background: '#E6E9EF',
      backgroundDeep: '#DDE1E8',
      surface: '#E6E9EF',
      insetFill: '#DADFE7',
      shadowLight: '#FFFFFF',
      shadowDark: '#B3BBC9',
      textPrimary: '#3A4250',
      textMuted: '#96A0B2',
      accent: '#EF6F6F',
      accentSoft: '#F7D7D7',
      insetBorderDark: 'rgba(150,160,178,0.55)',
      insetBorderLight: 'rgba(255,255,255,0.7)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#007AFF',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  dark: {
    name: 'dark',
    label: 'Dark Neumorphic',
    colors: {
      background: '#1E1E1E',
      backgroundDeep: '#181818',
      surface: '#1E1E1E',
      insetFill: '#252525',
      shadowLight: '#2C2C2C',
      shadowDark: '#0F0F0F',
      textPrimary: '#E8E8E8',
      textMuted: '#9E9E9E',
      accent: '#EF6F6F',
      accentSoft: '#3A2020',
      insetBorderDark: 'rgba(0,0,0,0.55)',
      insetBorderLight: 'rgba(255,255,255,0.08)',
      iosBg: '#1C1C1E',
      iosSeparator: '#38383A',
      iosBlue: '#0A84FF',
      iosRed: '#FF453A',
      iosGreen: '#30D158',
      iosGray: '#8E8E93',
      iosLabel: '#FFFFFF',
      iosSecondaryLabel: '#98989E',
    },
    radii,
    spacing,
    typography,
    isDark: true,
  },
  blue: {
    name: 'blue',
    label: 'Ocean Blue',
    colors: {
      background: '#E2E7F0',
      backgroundDeep: '#D6DBE8',
      surface: '#E2E7F0',
      insetFill: '#D6DBE8',
      shadowLight: '#F0F4FF',
      shadowDark: '#B0BBCF',
      textPrimary: '#2A3348',
      textMuted: '#8892A8',
      accent: '#5B7FFF',
      accentSoft: '#D6E0FF',
      insetBorderDark: 'rgba(150,160,178,0.5)',
      insetBorderLight: 'rgba(255,255,255,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#5B7FFF',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  pink: {
    name: 'pink',
    label: 'Blush Pink',
    colors: {
      background: '#F0E8EC',
      backgroundDeep: '#E8DEE4',
      surface: '#F0E8EC',
      insetFill: '#E8DEE4',
      shadowLight: '#FFF5F8',
      shadowDark: '#C4B5BE',
      textPrimary: '#3D2E36',
      textMuted: '#9A8892',
      accent: '#E87A8A',
      accentSoft: '#F8E0E4',
      insetBorderDark: 'rgba(170,150,160,0.5)',
      insetBorderLight: 'rgba(255,245,248,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#E87A8A',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  green: {
    name: 'green',
    label: 'Sage Green',
    colors: {
      background: '#E8F0E8',
      backgroundDeep: '#DEE6DE',
      surface: '#E8F0E8',
      insetFill: '#DEE6DE',
      shadowLight: '#F5FFF5',
      shadowDark: '#B5C4B5',
      textPrimary: '#2A3D2A',
      textMuted: '#829982',
      accent: '#6BBF6B',
      accentSoft: '#E0F5E0',
      insetBorderDark: 'rgba(160,180,160,0.5)',
      insetBorderLight: 'rgba(245,255,245,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#6BBF6B',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  gray: {
    name: 'gray',
    label: 'Cool Gray',
    colors: {
      background: '#E0E2E5',
      backgroundDeep: '#D6D8DC',
      surface: '#E0E2E5',
      insetFill: '#D6D8DC',
      shadowLight: '#FFFFFF',
      shadowDark: '#A8ABB2',
      textPrimary: '#2C2E33',
      textMuted: '#85888F',
      accent: '#7A8294',
      accentSoft: '#E2E5EA',
      insetBorderDark: 'rgba(160,163,170,0.5)',
      insetBorderLight: 'rgba(255,255,255,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#7A8294',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  purple: {
    name: 'purple',
    label: 'Lavender Purple',
    colors: {
      background: '#ECE8F2',
      backgroundDeep: '#E2DEE8',
      surface: '#ECE8F2',
      insetFill: '#E2DEE8',
      shadowLight: '#F5F2FF',
      shadowDark: '#C2B8CF',
      textPrimary: '#312A40',
      textMuted: '#8E82A0',
      accent: '#9B7FD4',
      accentSoft: '#EBE0F8',
      insetBorderDark: 'rgba(170,155,185,0.5)',
      insetBorderLight: 'rgba(245,242,255,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#9B7FD4',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
  gold: {
    name: 'gold',
    label: 'Sunset Gold',
    colors: {
      background: '#F0EAE0',
      backgroundDeep: '#E6DFD3',
      surface: '#F0EAE0',
      insetFill: '#E6DFD3',
      shadowLight: '#FFF8EE',
      shadowDark: '#C4BBA8',
      textPrimary: '#3D352A',
      textMuted: '#9E9485',
      accent: '#D4A545',
      accentSoft: '#F5EDD6',
      insetBorderDark: 'rgba(180,165,140,0.5)',
      insetBorderLight: 'rgba(255,255,255,0.65)',
      iosBg: '#F2F2F7',
      iosSeparator: '#E5E5EA',
      iosBlue: '#D4A545',
      iosRed: '#FF3B30',
      iosGreen: '#34C759',
      iosGray: '#8E8E93',
      iosLabel: '#1C1C1E',
      iosSecondaryLabel: '#8E8E93',
    },
    radii,
    spacing,
    typography,
    isDark: false,
  },
};
