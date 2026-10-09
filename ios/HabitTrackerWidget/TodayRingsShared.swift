import Foundation
import SwiftUI

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

  // MARK: - Date helpers (device-local, Monday-start weeks like the app)

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

  /// Monday-start week containing `date` (mirrors getWeekStart in habitStore.ts).
  static func mondayStart(of date: Date) -> Date {
    let cal = Calendar.current
    let weekday = cal.component(.weekday, from: date) // 1 = Sunday
    let daysBack = (weekday + 5) % 7
    let start = cal.date(byAdding: .day, value: -daysBack, to: date) ?? date
    return cal.startOfDay(for: start)
  }

  // MARK: - Progress (mirrors HabitCard ring logic)

  static func progress(for habit: RingsHabit, today: String) -> (Double, Bool) {
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
      let start = mondayStart(of: Date())
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
      let (p, done) = progress(for: habit, today: today)
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

enum HabitIconMapper {
  private static let map: [String: String] = [
    "fire": "flame.fill",
    "bolt": "bolt.fill",
    "scale": "scalemass.fill",
    "walk": "mappin",
    "heart": "heart.fill",
    "grooming": "scissors",
    "no-smoking": "nosign",
    "moon": "moon.fill",
    "sun": "sun.max.fill",
    "beaker": "testtube.2",
    "smile": "face.smiling.fill",
    "sparkles": "sparkles",
    "shield": "shield.fill",
    "book-open": "book.fill",
    "study": "graduationcap.fill",
    "pencil": "pencil",
    "checklist": "checklist",
    "check": "checkmark.circle.fill",
    "clock": "clock.fill",
    "calendar": "calendar",
    "idea": "lightbulb.fill",
    "language": "globe",
    "news": "newspaper.fill",
    "puzzle": "puzzlepiece.fill",
    "rocket": "rocket.fill",
    "settings": "gearshape.fill",
    "music": "music.note",
    "mic": "mic.fill",
    "camera": "camera.fill",
    "photo": "photo.fill",
    "paint": "paintbrush.fill",
    "swatch": "swatchpalette.fill",
    "ticket": "ticket.fill",
    "money": "dollarsign.circle.fill",
    "shopping-bag": "bag.fill",
    "cart": "cart.fill",
    "friends": "person.2.fill",
    "community": "person.3.fill",
    "volunteer": "hand.raised.fill",
    "thumbs-up": "hand.thumbsup.fill",
    "speech": "megaphone.fill",
    "call": "phone.fill",
    "globe": "globe",
    "truck": "box.truck.fill",
    "home": "building.2.fill",
    "house": "house.fill",
    "cloud": "cloud.fill",
    "computer": "desktopcomputer",
    "cpu": "cpu.fill",
    "trophy": "trophy.fill",
  ]

  /// SF Symbol name for a heroicon key, or nil to fall back to an initial.
  static func symbol(for key: String) -> String? {
    map[key]
  }
}
