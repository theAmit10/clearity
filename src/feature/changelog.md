# Habitic — Feature Changelog

Tracks which feature / language was added in which version, so it's easy to look up
when something shipped. Append a new entry for each release.

---

## v0.0.1 — 2026-08-01

### Localization (i18n)

- Full app localization via **react-native-localize**: all screens, components, and
  services (notifications, import/export, stats insights) support multiple languages.
- Auto-detects the device language; user can override it in-app (persisted).
- New **Language** screen (reached from Settings → Language) to pick the app language;
  the Settings row shows only the currently selected language name.
- Language names in the picker are always shown in English plus the native name,
  e.g. `German (Deutsch)`, so they stay readable no matter the active UI language.
- `src/i18n/index.ts` is the registration point; locale files live in `src/i18n/locales/`.

### Languages added

| Code | Language | Added |
|---|---|---|
| `en` | English | 2026-08-01 |
| `es` | Spanish | 2026-08-01 |
| `fr` | French | 2026-08-01 |
| `de` | German | 2026-08-01 |
| `it` | Italian | 2026-08-01 |
| `pt` | Portuguese | 2026-08-01 |
| `nl` | Dutch | 2026-08-01 |
| `ru` | Russian | 2026-08-01 |
| `hi` | Hindi | 2026-08-01 |
| `ar` | Arabic | 2026-08-01 |
| `ko` | Korean | 2026-08-01 |
| `ja` | Japanese | 2026-08-01 |
| `zh` | Chinese (Simplified) | 2026-08-01 |

### Known limitations (tracked)

- **Plurals**: only English-style `_one` / `_other` plural forms are supported.
  Russian (`ru`) and Arabic (`ar`) need `_few` / `_many` / `_zero` rules — not yet implemented.
- **RTL**: layouts are LTR-only. Arabic (`ar`) is a right-to-left language; it renders
  text correctly but the UI does not mirror for RTL yet.

---

## How to add a new entry

```
## v<version> — <YYYY-MM-DD>

### Features added
- ...

### Languages added
- `xx` — <Language name>

### Bug fixes / notes
- ...
```
