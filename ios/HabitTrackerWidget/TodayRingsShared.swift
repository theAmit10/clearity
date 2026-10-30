import Foundation
import SwiftUI
import UIKit

// MARK: - Widget paywall deep link (source `widget`)
//
// Locked widgets (free / expired Pro) render WidgetProLockView instead of
// habit data. Tapping it opens habita://paywall?source=widget (scheme
// registered in Info.plist) and JS routes straight into the paywall.

enum WidgetPaywall {
  static let url = URL(string: "habita://paywall?source=widget")!
}

/// Shared Pro-upsell card. Copy is hardcoded English: widget extensions
/// can't reach the app's JS i18n bundles.
struct WidgetProLockView: View {
  let expired: Bool

  var body: some View {
    VStack(spacing: 6) {
      Image(systemName: "lock.fill")
        .font(.system(size: 20, weight: .semibold))
        .foregroundColor(Color(hex: "#9E9E9E")!)
      Text("Widgets are Pro")
        .font(.system(size: 13, weight: .bold, design: .rounded))
        .foregroundColor(Color(hex: "#E8E8E8")!)
      Text(expired ? "Tap to renew" : "Tap to upgrade")
        .font(.system(size: 11, design: .rounded))
        .foregroundColor(Color(hex: "#9E9E9E")!)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Today Rings shared model
//
// Decoupled from WeekHeatmapWidget's structs so the rings widget and its
// intent can parse the payload (and mutate completions) independently.
// Unknown JSON keys are ignored; missing keys decode as nil.

struct RingsHabit: Codable {
  var id: String
  var name: String
  var color: String
  var icon: String?
  var frequency: String?
  var frequencyValue: Int?
  var frequencyWindow: Int?
  var completions: [String: Int]
}

struct RingsPayload: Codable {
  var habits: [RingsHabit]
  var weekStart: String?
  var weekEnd: String?
  /// First day of the week: 0 = Sunday, 1 = Monday (default when absent).
  var weekStartsOn: Int?
  /// True when widgets must render the Pro upsell instead of habit data.
  var locked: Bool?
  /// `expired` (Renew copy) vs anything else (Upgrade copy).
  var lockMode: String?
}

struct RingsPendingToggle: Codable {
  let habitId: String
  let dateKey: String
  let value: Int
  let timestamp: Double
}

struct RingsSnapshotHabit {
  let id: String
  let name: String
  let colorHex: String
  let iconKey: String
  let progress: Double
  let done: Bool
}

enum RingsStore {
  static let appGroup = "group.com.codethenic.habita.widget"
  static let ringsIdsKey = "ringsWidgetHabitIds"
  static let habitDataKey = "widgetHabitData"
  static let pendingKey = "widgetPendingToggles"
  static let maxRings = 10

  static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: appGroup)
  }

  // MARK: - Date helpers (device-local; week start follows the payload)

  static func todayKey(_ date: Date = Date()) -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.timeZone = TimeZone.current
    return f.string(from: date)
  }

  static func dateKey(byAddingDays offset: Int, to base: Date = Date()) -> String {
    let cal = Calendar.current
    let d = cal.date(byAdding: .day, value: offset, to: cal.startOfDay(for: base)) ?? base
    return todayKey(d)
  }

  /// Week containing `date` starting on `startDay` (0 = Sunday, 1 = Monday;
  /// mirrors startOfWeek in dateUtils.ts). Defaults to Monday.
  static func weekStart(of date: Date, startDay: Int = 1) -> Date {
    let cal = Calendar.current
    let weekday = cal.component(.weekday, from: date) // 1 = Sunday
    let daysBack = startDay == 0 ? weekday - 1 : (weekday + 5) % 7
    let start = cal.date(byAdding: .day, value: -daysBack, to: date) ?? date
    return cal.startOfDay(for: start)
  }

  // MARK: - Progress (mirrors HabitCard ring logic)

  static func progress(for habit: RingsHabit, today: String, weekStartsOn: Int = 1) -> (Double, Bool) {
    let freq = habit.frequency ?? "daily"
    switch freq {
    case "n_times_in_m_days":
      let target = max(1, habit.frequencyValue ?? 1)
      if target > 12 {
        // High-volume: window progress over the trailing window.
        let window = max(1, habit.frequencyWindow ?? 7)
        var sum = 0
        for i in 0..<window {
          sum += habit.completions[dateKey(byAddingDays: -i)] ?? 0
        }
        return (min(1, Double(sum) / Double(target)), sum >= target)
      }
      let current = habit.completions[today] ?? 0
      return (min(1, Double(current) / Double(target)), current >= target)
    case "n_times_per_week":
      let target = max(1, habit.frequencyValue ?? 3)
      let start = weekStart(of: Date(), startDay: weekStartsOn)
      var sum = 0
      for i in 0..<7 {
        let key: String
        if let d = Calendar.current.date(byAdding: .day, value: i, to: start) {
          key = todayKey(d)
        } else {
          continue
        }
        sum += habit.completions[key] ?? 0
      }
      return (min(1, Double(sum) / Double(target)), sum >= target)
    case "n_times_per_month":
      let target = max(1, habit.frequencyValue ?? 1)
      let prefix = String(today.prefix(7)) // "yyyy-MM"
      let sum = habit.completions.reduce(0) { acc, kv in
        kv.key.hasPrefix(prefix) ? acc + kv.value : acc
      }
      return (min(1, Double(sum) / Double(target)), sum >= target)
    default: // daily
      let current = habit.completions[today] ?? 0
      return (current > 0 ? 1 : 0, current > 0)
    }
  }

  // MARK: - Snapshot for the widget timeline

  static func snapshot() -> (
    rings: [RingsSnapshotHabit], configured: Bool, locked: Bool, expired: Bool
  ) {
    let defaults = defaults()
    let storedIds = defaults?.stringArray(forKey: ringsIdsKey) // nil = never configured
    let configured = storedIds != nil

    guard let json = defaults?.string(forKey: habitDataKey),
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(RingsPayload.self, from: data)
    else {
      return ([], configured, false, false)
    }

    // Locked widgets render the Pro upsell with no toggle targets.
    if payload.locked == true {
      return ([], configured, true, payload.lockMode == "expired")
    }

    let today = todayKey()
    let ordered: [RingsHabit]
    if let ids = storedIds {
      let byId = Dictionary(uniqueKeysWithValues: payload.habits.map { ($0.id, $0) })
      ordered = ids.prefix(maxRings).compactMap { byId[$0] }
    } else {
      // First run: show the first habits until the user picks their own.
      ordered = Array(payload.habits.prefix(maxRings))
    }

    let rings = ordered.map { habit -> RingsSnapshotHabit in
      let (p, done) = progress(for: habit, today: today, weekStartsOn: payload.weekStartsOn ?? 1)
      return RingsSnapshotHabit(
        id: habit.id,
        name: habit.name,
        colorHex: habit.color,
        iconKey: habit.icon ?? "fire",
        progress: p,
        done: done
      )
    }
    return (rings, configured, false, false)
  }

  // MARK: - Toggle (mirrors toggleCompletion in habitStore.ts)

  static func toggle(habitId: String) {
    guard let defaults = defaults(),
          let json = defaults.string(forKey: habitDataKey),
          let data = json.data(using: .utf8),
          var payload = try? JSONDecoder().decode(RingsPayload.self, from: data),
          payload.locked != true,
          let idx = payload.habits.firstIndex(where: { $0.id == habitId })
    else {
      return
    }

    let today = todayKey()
    var habit = payload.habits[idx]
    let freq = habit.frequency ?? "daily"
    let target: Int
    if freq == "n_times_in_m_days" {
      target = max(1, habit.frequencyValue ?? 1)
    } else {
      target = 1
    }
    let current = habit.completions[today] ?? 0
    let next = current >= target ? 0 : current + 1

    if next > 0 {
      habit.completions[today] = next
    } else {
      habit.completions.removeValue(forKey: today)
    }
    payload.habits[idx] = habit

    if let out = try? JSONEncoder().encode(payload),
       let outJson = String(data: out, encoding: .utf8) {
      defaults.set(outJson, forKey: habitDataKey)
    }

    // Queue an absolute-value op for the app to reconcile on next launch.
    var queue: [RingsPendingToggle] = []
    if let qJson = defaults.string(forKey: pendingKey),
       let qData = qJson.data(using: .utf8),
       let decoded = try? JSONDecoder().decode([RingsPendingToggle].self, from: qData) {
      queue = decoded
    }
    queue.append(RingsPendingToggle(
      habitId: habitId,
      dateKey: today,
      value: next,
      timestamp: Date().timeIntervalSince1970
    ))
    if queue.count > 200 {
      queue = Array(queue.suffix(200))
    }
    if let qOut = try? JSONEncoder().encode(queue),
       let qOutJson = String(data: qOut, encoding: .utf8) {
      defaults.set(qOutJson, forKey: pendingKey)
    }
  }
}

// MARK: - Heroicon key -> SF Symbol

// MARK: - Habit icon assets
//
// The app and both widgets draw the identical glyph: scripts/generate-icons.mjs
// rasterizes every catalog key from the shared icon source into this target's
// asset catalog as a white PNG (icon_<key>), and the widget tints it with the
// habit color through .template rendering — the same shapes react-native-svg
// renders in-app.
//
// __tests__/widgetIconParity.test.ts fails if any HABIT_ICONS key has no
// imageset, so this lookup never goes stale.

enum HabitIconAsset {
  /// Asset name for a catalog key, falling back to the fire asset so the ring
  /// center can never render blank (unknown or legacy keys, stale payloads).
  /// Returns nil only if the asset catalog itself failed to load.
  static func name(for key: String) -> String? {
    let candidate = "icon_\(key)"
    if UIImage(named: candidate) != nil {
      return candidate
    }
    if UIImage(named: "icon_fire") != nil {
      return "icon_fire"
    }
    return nil
  }
}
