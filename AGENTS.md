# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

### Mandatory checklist before writing any Mixpanel code

- [x] Confirm you are using the correct Mixpanel SDK — React Native bare workflow
- [ ] Check if this project routes data through a CDP — none
- [x] Check if consent gating is required — California users but analytics is covered in privacy policy, no consent gate
- [x] Review the existing Mixpanel tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | React Native (bare workflow) |
| **Mixpanel SDK** | mixpanel-react-native |
| **SDK version** | ^3.5.0 |
| **Tracking method** | client-side |
| **CDP (if any)** | none |
| **Consent required** | no — covered in privacy policy |
| **Mixpanel project token location** | `.env` → `MIXPANEL_TOKEN`, consumed via `react-native-config` in `src/constants/appInfo.ts` |

---

## Mixpanel Initialization

Mixpanel is initialized in:

**File:** `App.tsx` — called in the root `useEffect` via `initAnalytics()`

```
import { initAnalytics } from './src/services/analytics';

// Called once on app launch alongside store init
initAnalytics();
```

**Do not:**
- Initialize Mixpanel in multiple places
- Create separate Mixpanel instances per component or module
- Import Mixpanel directly in feature files — use the shared `trackEvent` wrapper from `src/services/analytics.ts`

---

## Mixpanel Identity

This app has **no user accounts or auth** — it's a local-only habit tracker. Identity management is not used. All events are anonymous.

If auth is added in the future:

| Action | When to call | Code location |
|---|---|---|
| `mixpanel.identify(user_id)` | On login, signup, or session restore | Add to auth handler |
| `mixpanel.reset()` | On logout | Add to logout handler |

---

## Mixpanel Tracking Plan

### Naming conventions

- Event names: `snake_case`, past tense verb + noun
- Property names: `snake_case`
- No abbreviations — use full words

### Current Mixpanel events

| Event | Trigger | Key Properties | File |
|---|---|---|---|
| `app_opened` | App launches and store initializes | `habit_count` | `src/store/habitStore.ts` |
| `screen_view` | User navigates to a screen | `screen_name` | `src/navigation/RootNavigator.tsx` |
| `habit_added` | User creates a new habit | `icon`, `frequency` | `src/store/habitStore.ts` |
| `habit_deleted` | User deletes a habit | — | `src/store/habitStore.ts` |
| `habit_completed` | User checks off a habit for a day | — | `src/store/habitStore.ts` |
| `habit_uncompleted` | User unchecks a habit | — | `src/store/habitStore.ts` |
| `habits_reordered` | User reorders habit list | — | `src/store/habitStore.ts` |
| `habits_imported` | User imports habits (replace or merge) | `count`, `type` | `src/store/habitStore.ts` |

### Value Moment

The core value moment is **habit_completed** — a user checking off a habit. This represents active engagement and habit formation, which is the primary purpose of the app.

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above** — if the event already exists, use it. Do not create duplicates.
2. **Name the event** using `snake_case`, past tense, descriptive.
3. **Define properties** — only include properties available at the moment the event fires.
4. **Place the tracking call** after the action succeeds (after store update, DB write, API response).
5. **Update this file** with the new event in the tracking plan table.
6. **Verify in Mixpanel Live View** before considering it done.

### Event template

```
import { trackEvent } from '../services/analytics';

trackEvent('event_name', {
  property_name: value,
});
```

---

## What Not to Do

- **Do not introduce other analytics tools** — this project uses Mixpanel.
- **Do not track PII** — no emails, full names, phone numbers, or payment details in event properties.
- **Do not fire events inside loops** — each call is a network request.
- **Do not hardcode the Mixpanel project token** — it's in `.env` (never committed). Copy `.env.example` to `.env` and fill in the value.
- **Do not add PII** such as habit names that could identify a person.
