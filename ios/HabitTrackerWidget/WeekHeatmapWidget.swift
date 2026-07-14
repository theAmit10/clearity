import WidgetKit
import SwiftUI

// MARK: - Neumorphic Colors

struct NeumorphicColors {
  static let background = Color(hex: "#E6E9EF")!
  static let backgroundDeep = Color(hex: "#DDE1E8")!
  static let insetFill = Color(hex: "#DADFE7")!
  static let shadowLight = Color.white
  static let shadowDark = Color(hex: "#B3BBC9")!
  static let textPrimary = Color(hex: "#3A4250")!
  static let textMuted = Color(hex: "#96A0B2")!
}

// MARK: - Shared Data

struct WidgetHabitData: Codable {
  let id: String
  let name: String
  let color: String
  let completions: [String: Bool]
}

struct WidgetDataPayload: Codable {
  let habits: [WidgetHabitData]
  let weekStart: String
  let weekEnd: String
}

// MARK: - Timeline Entry

struct WeekHeatmapEntry: TimelineEntry {
  let date: Date
  let habits: [WidgetHabitData]
  let weekDates: [String]
  let todayKey: String
  let isEmpty: Bool
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {

  private let appGroup = "group.com.codethenic.habita.widget"

  func placeholder(in context: Context) -> WeekHeatmapEntry {
    WeekHeatmapEntry(
      date: Date(),
      habits: [],
      weekDates: weekDateKeys(),
      todayKey: todayKeyString(),
      isEmpty: true
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (WeekHeatmapEntry) -> Void) {
    let entry = loadEntry()
    completion(entry)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WeekHeatmapEntry>) -> Void) {
    let entry = loadEntry()
    let timeline = Timeline(entries: [entry], policy: .after(nextRefreshDate()))
    completion(timeline)
  }

  private func loadEntry() -> WeekHeatmapEntry {
    guard let defaults = UserDefaults(suiteName: appGroup) else {
      return emptyEntry()
    }

    let selectedIds = defaults.stringArray(forKey: "selectedWidgetHabitIds") ?? []
    let habitDataJson = defaults.string(forKey: "widgetHabitData")

    guard let json = habitDataJson,
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(WidgetDataPayload.self, from: data)
    else {
      return emptyEntry()
    }

    let selectedHabits = payload.habits.filter { h in
      selectedIds.contains(h.id)
    }

    return WeekHeatmapEntry(
      date: Date(),
      habits: selectedHabits,
      weekDates: weekDateKeys(),
      todayKey: todayKeyString(),
      isEmpty: selectedHabits.isEmpty
    )
  }

  private func emptyEntry() -> WeekHeatmapEntry {
    WeekHeatmapEntry(
      date: Date(),
      habits: [],
      weekDates: weekDateKeys(),
      todayKey: todayKeyString(),
      isEmpty: true
    )
  }

  private func todayKeyString() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone.current
    return formatter.string(from: Date())
  }

  private func weekDateKeys() -> [String] {
    let cal = Calendar.current
    let today = Date()
    guard let weekStart = cal.dateInterval(of: .weekOfMonth, for: today)?.start else {
      return []
    }
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    formatter.timeZone = TimeZone.current
    return (0..<7).compactMap { dayOffset in
      guard let date = cal.date(byAdding: .day, value: dayOffset, to: weekStart) else {
        return nil
      }
      return formatter.string(from: date)
    }
  }

  private func nextRefreshDate() -> Date {
    let cal = Calendar.current
    let tomorrow = cal.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    return cal.startOfDay(for: tomorrow)
  }
}

// MARK: - Widget

struct WeekHeatmapWidget: Widget {
  let kind: String = "WeekHeatmap"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      WeekHeatmapEntryView(entry: entry)
    }
    .configurationDisplayName("Week Heatmap")
    .description("Shows your weekly habit completion heatmap.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Entry View

struct WeekHeatmapEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var body: some View {
    if family == .systemSmall {
      SmallWidgetView(entry: entry)
    } else {
      MediumWidgetView(entry: entry)
    }
  }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
  var entry: Provider.Entry

  var body: some View {
    VStack(spacing: 4) {
      HStack(spacing: 3) {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 8))
          .foregroundColor(Color(hex: "#34C759")!)
        Text("This Week")
          .font(.system(size: 9, weight: .semibold))
          .foregroundColor(NeumorphicColors.textPrimary)
        Spacer()
      }

      if entry.isEmpty {
        Spacer()
        Image(systemName: "square.grid.3x3.topleft.filled")
          .font(.system(size: 16))
          .foregroundColor(NeumorphicColors.textMuted)
        Text("No habit selected")
          .font(.system(size: 8))
          .foregroundColor(NeumorphicColors.textMuted)
        Spacer()
      } else {
        ForEach(entry.habits.prefix(3), id: \.id) { habit in
          SmallHabitRow(
            habit: habit,
            weekDates: entry.weekDates,
            todayKey: entry.todayKey
          )
        }
      }
    }
    .padding(8)
    .containerBackground(NeumorphicColors.background, for: .widget)
  }
}

struct SmallHabitRow: View {
  let habit: WidgetHabitData
  let weekDates: [String]
  let todayKey: String

  var body: some View {
    HStack(spacing: 4) {
      Circle()
        .fill(Color(hex: habit.color) ?? NeumorphicColors.textPrimary)
        .frame(width: 6, height: 6)

      Text(habit.name)
        .font(.system(size: 8, weight: .medium))
        .foregroundColor(NeumorphicColors.textPrimary)
        .lineLimit(1)
        .frame(maxWidth: 52, alignment: .leading)

      Spacer(minLength: 2)

      HStack(spacing: 1.5) {
        ForEach(weekDates, id: \.self) { dateKey in
          let completed = habit.completions[dateKey] ?? false
          let isToday = dateKey == todayKey
          SmallDayCell(
            completed: completed,
            isToday: isToday,
            color: Color(hex: habit.color) ?? NeumorphicColors.textPrimary
          )
        }
      }
    }
  }
}

struct SmallDayCell: View {
  let completed: Bool
  let isToday: Bool
  let color: Color

  var body: some View {
    RoundedRectangle(cornerRadius: 2)
      .fill(completed ? color : NeumorphicColors.insetFill)
      .frame(width: 10, height: 10)
      .overlay(
        RoundedRectangle(cornerRadius: 2)
          .stroke(isToday ? NeumorphicColors.textPrimary.opacity(0.4) : .clear, lineWidth: 0.8)
      )
      .shadow(
        color: completed ? .clear : NeumorphicColors.shadowDark.opacity(0.25),
        radius: 0.5, x: 0.5, y: 0.5
      )
      .shadow(
        color: completed ? .clear : NeumorphicColors.shadowLight.opacity(0.7),
        radius: 0.5, x: -0.5, y: -0.5
      )
  }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
  var entry: Provider.Entry

  var body: some View {
    VStack(spacing: 6) {
      HStack(spacing: 5) {
        ZStack {
          RoundedRectangle(cornerRadius: 5)
            .fill(NeumorphicColors.insetFill)
            .frame(width: 18, height: 18)
            .shadow(color: NeumorphicColors.shadowDark.opacity(0.3), radius: 1, x: 1, y: 1)
            .shadow(color: NeumorphicColors.shadowLight.opacity(0.8), radius: 1, x: -1, y: -1)
          Image(systemName: "checkmark.circle.fill")
            .font(.system(size: 10))
            .foregroundColor(Color(hex: "#34C759")!)
        }
        Text("This Week")
          .font(.system(size: 12, weight: .semibold))
          .foregroundColor(NeumorphicColors.textPrimary)
        Spacer()
      }

      if entry.isEmpty {
        Spacer()
        VStack(spacing: 6) {
          ZStack {
            RoundedRectangle(cornerRadius: 8)
              .fill(NeumorphicColors.insetFill)
              .frame(width: 28, height: 28)
              .shadow(color: NeumorphicColors.shadowDark.opacity(0.3), radius: 2, x: 2, y: 2)
              .shadow(color: NeumorphicColors.shadowLight.opacity(0.8), radius: 2, x: -2, y: -2)
            Image(systemName: "square.grid.3x3.topleft.filled")
              .font(.system(size: 14))
              .foregroundColor(NeumorphicColors.textMuted)
          }
          Text("No habit selected")
            .font(.caption2)
            .foregroundColor(NeumorphicColors.textMuted)
        }
        Spacer()
      } else {
        ForEach(entry.habits.prefix(3), id: \.id) { habit in
          MediumHabitRow(
            habit: habit,
            weekDates: entry.weekDates,
            todayKey: entry.todayKey
          )
        }
      }
    }
    .padding(12)
    .containerBackground(NeumorphicColors.background, for: .widget)
  }
}

struct MediumHabitRow: View {
  let habit: WidgetHabitData
  let weekDates: [String]
  let todayKey: String

  var body: some View {
    HStack(spacing: 6) {
      ZStack {
        RoundedRectangle(cornerRadius: 6)
          .fill(NeumorphicColors.insetFill)
          .frame(width: 18, height: 18)
          .shadow(color: NeumorphicColors.shadowDark.opacity(0.25), radius: 1, x: 1, y: 1)
          .shadow(color: NeumorphicColors.shadowLight.opacity(0.8), radius: 1, x: -1, y: -1)
        Circle()
          .fill(Color(hex: habit.color) ?? NeumorphicColors.textPrimary)
          .frame(width: 10, height: 10)
      }

      Text(habit.name)
        .font(.system(size: 10, weight: .medium))
        .foregroundColor(NeumorphicColors.textPrimary)
        .lineLimit(1)

      Spacer()

      HStack(spacing: 3) {
        ForEach(weekDates, id: \.self) { dateKey in
          let completed = habit.completions[dateKey] ?? false
          let isToday = dateKey == todayKey
          MediumDayCell(
            completed: completed,
            isToday: isToday,
            color: Color(hex: habit.color) ?? NeumorphicColors.textPrimary
          )
        }
      }
    }
    .padding(.vertical, 3)
    .padding(.horizontal, 6)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(NeumorphicColors.background)
        .shadow(color: NeumorphicColors.shadowDark.opacity(0.4), radius: 2, x: 2, y: 2)
        .shadow(color: NeumorphicColors.shadowLight.opacity(0.8), radius: 2, x: -2, y: -2)
    )
  }
}

struct MediumDayCell: View {
  let completed: Bool
  let isToday: Bool
  let color: Color

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 3)
        .fill(completed ? color : NeumorphicColors.insetFill)
        .frame(width: 16, height: 16)
        .shadow(
          color: completed ? .clear : NeumorphicColors.shadowDark.opacity(0.3),
          radius: 1, x: 1, y: 1
        )
        .shadow(
          color: completed ? .clear : NeumorphicColors.shadowLight.opacity(0.7),
          radius: 1, x: -1, y: -1
        )
        .overlay(
          RoundedRectangle(cornerRadius: 3)
            .stroke(isToday ? NeumorphicColors.textPrimary.opacity(0.4) : .clear, lineWidth: isToday ? 1 : 0)
        )

      if completed {
        Image(systemName: "checkmark")
          .font(.system(size: 8, weight: .bold))
          .foregroundColor(.white)
      }
    }
  }
}

// MARK: - Hex Color Extension

extension Color {
  init?(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    guard Scanner(string: hex).scanHexInt64(&int) else { return nil }
    let r, g, b: UInt64
    switch hex.count {
    case 6:
      (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
    case 3:
      (r, g, b) = ((int >> 8) & 0xF * 17, (int >> 4) & 0xF * 17, int & 0xF * 17)
    default:
      return nil
    }
    self.init(
      .sRGB,
      red: Double(r) / 255,
      green: Double(g) / 255,
      blue: Double(b) / 255,
      opacity: 1
    )
  }
}
