# Localization (i18n)

This document explains the steps and todos implemented to localize **Habitic** into multiple languages worldwide.

## Goal

Make the app usable by more people by translating every user-facing string into the user's language.

- First languages: **English, Spanish, French, German** (en / es / fr / de)
- Library: **react-native-localize** (device locale detection) — no i18next, kept the dependency surface small
- Language control: **auto-detect device language** + **in-app override** (persisted)
- Storage: local JSON files in `src/i18n/locales/`
- Out of scope for now: iOS/Android home-screen widgets (phase 2), RTL layouts (all 4 languages are LTR)

## How it works

### Runtime (`src/i18n/index.ts`)

- `resolveLanguage()`: reads the persisted override from AsyncStorage → falls back to `RNLocalize.getLocales()[0].languageCode` → falls back to `en`.
- `useTranslation()` hook: returns `{ t, language, loaded }` for React components. Re-renders when the language changes.
- Module-level `t(key, params)`: for services / non-React contexts.
- Interpolation: `t('settings.exportData', { count: habits.length })` replaces `{{count}}`.
- Plurals: keys ending `_one` / `_other` are auto-selected when a numeric `count` is passed (e.g. `stats.dayStreak_one`, `stats.dayStreak_other`).
- Typed keys: `TranslationKey` is derived from `en.json` (source of truth) at compile time, so typos are caught by TypeScript.
- `useI18nStore` (zustand): mirrors the existing `useHabitStore` pattern.

### Init (`App.tsx`)

`initI18n()` runs in the root `useEffect` alongside `initAnalytics()`, `initRevenueCat()`, `init()`. The loading gate waits for both `loaded` (habits) and `i18nLoaded` so the app never flashes English before the right language is resolved.

## Steps / Todos implemented

1. **Install dependency**
   - `npm install react-native-localize` (v3.7.0)
   - `cd ios && pod install` (regenerated the Podfile.lock / project.pbxproj)
2. **Create locale JSON files** — `src/i18n/locales/{en,es,fr,de}.json`
   - `en.json` is the source of truth (structure = key set)
   - `es/fr/de` are full translations; the `Record<Language, typeof en>` type enforces they stay complete
3. **Build the i18n runtime** — `src/i18n/index.ts`
   - resolve + persist language, typed `t()` with interpolation & plurals, zustand store, `useTranslation` hook, `initI18n()`
4. **Wire i18n into App.tsx** — init before first render + gate the loading screen on `i18nLoaded`
5. **Localize constants at display time**
   - Category names (`categories.*`), theme labels (`themes.*`), frequency labels (`frequency.*`) are looked up by key where they are rendered; the data model keeps storing stable keys (no data migration)
6. **Localize navigation + calendar components**
   - Tab bar labels, `ScreenHeader` back label, `MonthlyCalendar` / `YearHeatmap` weekday & month arrays, `StreakHeatmap` month labels, `WeekdayLabels`
7. **Localize shared components**
   - `StatsRow`, `ProGate`, `ErrorBoundary`, `HabitCard` (streaks, frequency labels, built-in category badges)
8. **Localize all screens**
   - `Home`, `AddEditHabit`, `NewCategory`, `HabitDetail`, `Analytics`, `Paywall`, `ManageSubscription`, `Settings`, `General`, `WidgetSettings`, `ReorderHabits`, `NotificationSettings`, `HabitNotificationConfig`, `AdminNotification`
9. **Localize services**
   - `notification.ts` (channel name + default admin notifications), `importExport.ts` (user-facing errors), `habitStore.ts` (limit errors), `statsService.ts` (insight text)
10. **Add in-app language switcher** — new "Language" section in `SettingsScreen`
11. **Tests + Jest config**
    - `jest.config.js`: added `react-native-localize` (plus the transitive native-module deps) to `transformIgnorePatterns`; added a heroicons `moduleNameMapper`
    - `__mocks__/heroicons.js` stub
    - Added `react-native-localize` / native-module mocks to `__tests__/App.test.tsx`, `habitStore.test.ts`, `statsService.test.ts`
    - Fixed pre-existing test-infra issues so the suite is green: mock `react-native-fs`, `react-native-share`, `@react-native-documents/picker`, `@react-native-firebase/crashlytics`, reanimated/worklets mocks
    - Result: **31/31 tests pass, 3/3 suites**
12. **Verification**
    - `tsc --noEmit` clean (also fixed the pre-existing `global` type error in `src/services/logger.ts:59` by using `globalThis` — same runtime value in React Native, previously the tsconfig lib lacked a `global` declaration)
    - `npm run lint` back to baseline (45 pre-existing errors / 126 warnings; the 2 errors introduced by localization were fixed)

## Things that are NOT translated

- User-entered content: habit names, custom category names, notification titles/bodies typed by users
- Analytics event names (Mixpanel) and log strings
- Backup filenames and internal identifiers
- Prices / currency strings from the RevenueCat SDK

## Adding a new language

Example: adding Italian (`it`). Every step is manual and intentional — nothing auto-generates.

### 1. Create the translation file

Copy `src/i18n/locales/en.json` → `src/i18n/locales/it.json` and translate every value.
**Start from `en.json`** — it is the source of truth, so its structure guarantees the key set matches.

### 2. Register it in `src/i18n/index.ts`

Three one-line edits:

- **Import** (with the other locale imports, ~line 7):
  `import it from './locales/it.json';`
- **Add to `LANGUAGES`** (~line 9):
  `export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it'] as const;`
  Order in this array = order shown in the Settings switcher.
- **Add to `translations`** (~line 15):
  `const translations: Record<Language, typeof en> = { en, es, fr, de, it };`

### 3. Add its native label to every locale file

The switcher renders `t('languages.${code}')` (`SettingsScreen.tsx:453`), and the label is looked
up in the **active** language's file. So add `"it": "Italiano"` inside the `languages` section of
**all** locale files (`en`, `es`, `fr`, `de`, and the new `it`). The name stays in Italian in every
file so users recognize it no matter the current UI language.

### 4. Verify

Run `npx tsc --noEmit`. Because `translations` is typed `Record<Language, typeof en>`, TypeScript
will fail until `it.json` has **every** key `en.json` has — no missing-key bugs possible. `Language`
and `TranslationKey` update automatically, so device detection (`getDeviceLanguage()` checks
`code in translations`), the persisted override, English fallback, and the switcher all just work.

### Caveat: languages with complex plurals

Plurals currently only support English-style `_one` / `_other` (`pluralKey` at `src/i18n/index.ts:51`).
That is correct for `es` / `fr` / `de` / `it`. But **Polish, Russian, Czech, Arabic**, etc. need 3–4
plural forms (`_few`, `_many`, `_zero`). For those, extend `pluralKey` with per-language rules before
adding the language, and add the extra `_<form>` keys to the locale file.

### Optional: native Settings localization

`RNLocalize` reads the device locale, so auto-detection works without any native config. If you also
want the app listed under the system Settings language list, declare the supported localizations in
`Info.plist` (`CFBundleDevelopmentRegion` + `CFBundleLocalizations`) and Android `res/values-*`
folders. This is cosmetic and not required.

## Adding a new string

1. Add the key to `en.json` (source of truth) and to `es/fr/de`.
2. Use it: `const { t } = useTranslation();` → `t('section.key', { params })` in components, or `import { t } from '../i18n';` → `t('section.key')` in services.
3. Plurals: add `key_one` / `key_other` variants and pass a `count` param.
