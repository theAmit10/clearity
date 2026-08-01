# Habitic — Performance Issues Log

Log of all known performance issues, prioritized so they can be fixed one by one.
Tick each item off as you fix it.

**App context:** small local dataset (habit list), so the bottlenecks are rendering
smoothness (scroll / toggle / drag), app startup, and memory — not data size.

---

## How to measure (use these before and after each fix)

| Metric | What | Tool |
|---|---|---|
| JS thread FPS / dropped frames | Smoothness of scroll, toggle, drag | React DevTools Profiler → "Highlight updates"; RN DevTools `p` in Metro for Perf Monitor |
| Component render times / re-renders | Find slow / over-rendering components | React DevTools Profiler (flamegraph) |
| Startup time (TTI) | Time from launch to UI ready (`loaded`) | Xcode Instruments "Launch", Android `adb shell am start -W`, or console.log timestamps around `init()` |
| CPU profile | Where JS time goes | Hermes profiler: `npx react-native profile-hermes` (Metro docs); Xcode Time Profiler; Android Profiler |
| Memory / heap | Leaks, growth while scrolling/toggling | Xcode Instruments "Allocations", Android Profiler "Memory" |
| JS bundle size | Parse/startup cost | `npx react-native bundle --platform ios --dev false --entry-file index.js` then `npx react-native-bundle-visualizer` (or check Metro output size) |
| App install size | Download size | `xcodebuild archive` / Android `bundletool`, or Xcode Organizer |

> Baseline the app BEFORE making changes so you know if a fix actually helped.

---

## P0 — Fix first (biggest impact)

### [ ] 1. HabitCard heatmap renders ~364 Views per card but ignores `weeks`
- **File:** `src/components/HabitCard.tsx:196` passes `weeks={14}` but
  `src/components/HeatmapGrid.tsx:36-44` never reads the `weeks` prop → it renders the **entire year**
  (52 weeks × 7 days ≈ 364 absolutely-positioned `<View>`s) on **every card**.
  With N habits that's N×364 Views on screen, and each has inline border styles.
- **Fix:** actually honor `weeks` (default ~14, trailing weeks up to today) inside `HeatmapGrid`
  (slice `weeksData` and drop the horizontal `ScrollView` if it fits), and memoize the cell
  layer with `React.memo`. Optional: replace the grid with a single
  `react-native-svg` `Rect`s inside one `<Svg>` (one native node per card instead of hundreds of Views).
- **How to verify:** scroll the home list → JS FPS before/after.

### [ ] 2. Neumorphic shadows on every card (expensive iOS shadows without `shadowPath`)
- **File:** `src/components/neumorphic/NeumorphicView.tsx` — every `Raised`/`Inset` adds 2 extra
  absolutely-positioned shadow layers; `HabitCard.tsx:71-200` nests multiple `Raised`/`Inset`
  (card + icon badge + check circle). iOS soft shadows (`shadowRadius`, no `shadowPath`) are
  re-rasterized every frame during scroll → jank.
- **Fix:** add a precomputed `shadowPath` (rounded-rect) to the shadow layers and/or
  `shouldRasterizeIOS` on the card's shadow wrapper; reduce the number of shadow layers per card.
  Optionally collapse shadows while the list is scrolling.
- **How to verify:** scroll performance and Xcode Instruments Core Animation.

### [ ] 3. `computeStats` recomputed on every card render + WeakMap cache misses after each toggle
- **File:** `src/components/HabitCard.tsx:49` calls `computeStats(habit)` unconditionally each render.
- **File:** `src/store/habitStore.ts:483-556` caches `computeEffectiveDateSet` in a WeakMap keyed by the
  habit **object reference** — but `toggleCompletion` (habitStore.ts:218-249) creates a new habit
  object, so the cache misses and every card recomputes the full effective date set (O(n²) for
  `n_times_in_m_days`) after every tap.
- **Fix:** wrap `computeStats` in `useMemo` in HabitCard; change the heatmap cache to a
  `WeakMap<completionsObj, Set<string>>` keyed by the `completions` object (which is preserved
  across toggles of other habits and replaced only for the toggled one); add `React.memo` to
  HabitCard/HeatmapGrid.
- **How to verify:** React DevTools Profiler — record a tap, check `computeStats`/`computeEffectiveDateSet` render cost.

---

## P1 — Next

### [ ] 4. App startup blocked on RevenueCat network call
- **File:** `src/store/habitStore.ts:98-177` — `init()` calls `await getCustomerInfo()` (network)
  **before** `set({ loaded: true })`. The loading spinner (`App.tsx:56-64`) stays until the
  network responds (slow on offline/slow networks).
- **Fix:** load local storage first → `set({ loaded: true })`, then run `getCustomerInfo()` +
  `refreshProStatus()` in the background (pro badge can appear after first paint).

### [ ] 5. Widget native-bridge work on every toggle
- **File:** `src/store/habitStore.ts:68-73` `updateWidget()` runs
  `updateWidgetData` + `reloadWidget` synchronously after **every** tap
  (habitStore.ts:218-249, plus add/delete/import/reorder). JS→native bridge calls on the
  main path cause frame drops during rapid toggling.
- **Fix:** throttle/debounce (e.g. 500ms–1s) and run after the tap has returned; skip the
  `reloadWidget` when nothing visible changed.

### [ ] 6. Whole-list re-render on any state change
- **File:** `src/screens/HomeScreen.tsx:31` selects `s.habits`; every store write to `habits`
  re-renders the list, and each `HabitCard` subscribes to 4 store slices + `customCategories`
  (HabitCard.tsx:39-42) → all cards re-render on any habit change.
- **Fix:** `React.memo` the card with stable callbacks (`useCallback` for `onToggleToday`),
  select `customCategories` with `useShallow` from `zustand/react/shallow`, and avoid passing
  inline closures through `renderItem` (HomeScreen.tsx:71-94).
- **How to verify:** React DevTools Profiler "Highlight updates" while toggling.

### [ ] 7. DraggableFlatList drag feels heavy
- **File:** `src/screens/HomeScreen.tsx:195-201` — drag-reorder of shadow-heavy cards.
- **Fix:** reduce shadow work while dragging (see #2), set `activationDistance`,
  lower `autoscrollSpeed`, and avoid re-rendering the whole list during drag.

---

## P2 — Polish

### [ ] 8. Startup work that can be deferred
- **File:** `App.tsx:43-54` reschedules notifications after load; `habitStore.init()` updates the
  widget. These can run after first paint via `InteractionManager.runAfterInteractions(...)`.

### [ ] 9. Bundle size / unused dependencies
- **`react-native-shadow-2` (package.json:36) is likely dead weight:** its only consumer is
  `src/components/habit-tracker/Raised.tsx`, which belongs to the whole
  `src/components/habit-tracker/` folder (HabitCard, HabitHeader, NeumorphicPressable, PillsRow,
  Raised, StreakHeatmap, CalendarGrid, WeekdayLabels). **No active screen imports that folder** —
  the live UI uses `src/components/HabitCard.tsx` + `src/components/HeatmapGrid.tsx`.
  If confirmed dead, delete the folder + the dep, and drop the `__tests__/App.test.tsx:19` mock.
- Check `react-native-purchases-ui` is actually needed.
- Audit the bundle with `react-native-bundle-visualizer` (see table above); consider dropping
  heavy unused libs.

### [ ] 10. `rescheduleAll` / import-export edge
- Confirm `services/notification.ts` `rescheduleAll` isn't fired inside loops and only runs once
  per launch (per AGENTS.md: no event calls in loops).

### [ ] 11. Memory growth during long sessions
- Heatmap grids (#1) and shadow layers (#2) are the main memory drivers — fixes above help.
- Re-check heap after 5 min of scrolling/toggling with Instruments/Profiler.

---

## Tracked, not urgent

- **Plurals (ru/ar)** and **RTL (ar)** — functional, not perf (see `changelog.md`).
- **i18n re-render:** language change re-renders consumers — expected, negligible.

---

### How to use this file
1. Pick the highest unchecked item.
2. Reproduce + measure the metric with the tool in the table.
3. Apply the fix.
4. Re-measure and note the result next to the item before ticking it.
