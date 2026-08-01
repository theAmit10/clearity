import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import ru from './locales/ru.json';
import hi from './locales/hi.json';
import ar from './locales/ar.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';

export const LANGUAGES = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'ru',
  'hi',
  'ar',
  'ko',
  'ja',
  'zh',
] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

const STORAGE_KEY = '@habit_tracker/language';

const translations: Record<Language, typeof en> = {
  en,
  es,
  fr,
  de,
  it,
  pt,
  nl,
  ru,
  hi,
  ar,
  ko,
  ja,
  zh,
};

type Leaf = string | string[];
type Paths<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends Leaf
    ? `${Prefix}${K & string}`
    : T[K] extends object
      ? Paths<T[K], `${Prefix}${K & string}.`>
      : never;
}[keyof T];

type Keys = Paths<typeof en>;
type PluralBaseKey = {
  [K in Keys]: K extends `${infer Base}_one` | `${infer Base}_other` ? Base : never;
}[Keys];

export type TranslationKey = Keys | PluralBaseKey;
export type TranslationParams = Record<string, string | number>;

function lookup(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name];
    return value == null ? match : String(value);
  });
}

function pluralKey(key: TranslationKey, count: number): string {
  return `${key}_${count === 1 ? 'one' : 'other'}`;
}

function translate(lang: Language, key: TranslationKey, params?: TranslationParams): string {
  const dict = translations[lang];
  let template = lookup(dict, key) as string | undefined;

  if (template == null && params && typeof params.count === 'number') {
    template = lookup(dict, pluralKey(key, params.count)) as string | undefined;
  }

  if (template == null && lang !== DEFAULT_LANGUAGE) {
    template = lookup(en, key) as string | undefined;
    if (template == null && params && typeof params.count === 'number') {
      template = lookup(en, pluralKey(key, params.count)) as string | undefined;
    }
  }

  if (Array.isArray(template)) return template as unknown as string;
  if (typeof template !== 'string') return key;
  return interpolate(template, params);
}

export function getDeviceLanguage(): Language {
  const code = RNLocalize.getLocales()[0]?.languageCode;
  if (code && code in translations) return code as Language;
  return DEFAULT_LANGUAGE;
}

export async function resolveLanguage(): Promise<Language> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && stored in translations) return stored as Language;
  } catch {
    // ignore storage errors, fall back to device language
  }
  return getDeviceLanguage();
}

export function t(key: TranslationKey, params?: TranslationParams): string {
  return useI18nStore.getState().t(key, params);
}

interface I18nState {
  language: Language;
  loaded: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: DEFAULT_LANGUAGE,
  loaded: false,
  t: (key, params) => translate(get().language, key, params),
  setLanguage: async (lang: Language) => {
    set({ language: lang });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors; in-memory language still applies
    }
  },
}));

export async function initI18n(): Promise<void> {
  const language = await resolveLanguage();
  useI18nStore.setState({ language, loaded: true });
}

export function useTranslation() {
  const language = useI18nStore(s => s.language);
  const loaded = useI18nStore(s => s.loaded);
  const t = useI18nStore(s => s.t);
  return { t, language, loaded };
}
