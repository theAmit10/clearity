import WidgetKit
import SwiftUI

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

  // MARK: - Date Helpers

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

// MARK: - Views

struct WeekHeatmapEntryView: View {
  var entry: Provider.Entry

  private var weekdaySymbols: [String] {
    let symbols = Calendar.current.shortStandaloneWeekdaySymbols
    return [symbols[0], symbols[1], symbols[2], symbols[3], symbols[4], symbols[5], symbols[6]]
  }

  var body: some View {
    VStack(spacing: 4) {
      HStack {
        Image(systemName: "checkmark.circle.fill")
          .font(.caption2)
          .foregroundColor(.green)
        Text("This Week")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundColor(.primary)
        Spacer()
      }
      .padding(.bottom, 2)

      if entry.isEmpty {
        Spacer()
        VStack(spacing: 6) {
          Image(systemName: "square.grid.3x3.topleft.filled")
            .font(.title2)
            .foregroundColor(.secondary)
          Text("No habit selected")
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        Spacer()
      } else {
        ForEach(entry.habits, id: \.id) { habit in
          HabitWeekRow(
            habit: habit,
            weekDates: entry.weekDates,
            todayKey: entry.todayKey
          )
        }
      }
    }
    .padding(12)
    .containerBackground(.background, for: .widget)
  }
}

struct HabitWeekRow: View {
  let habit: WidgetHabitData
  let weekDates: [String]
  let todayKey: String

  var body: some View {
    HStack(spacing: 6) {
      Circle()
        .fill(Color(hex: habit.color) ?? .accentColor)
        .frame(width: 16, height: 16)

      Text(habit.name)
        .font(.caption2)
        .fontWeight(.medium)
        .foregroundColor(.primary)
        .lineLimit(1)

      Spacer()

      HStack(spacing: 3) {
        ForEach(weekDates, id: \.self) { dateKey in
          let completed = habit.completions[dateKey] ?? false
          let isToday = dateKey == todayKey
          DayCell(
            completed: completed,
            isToday: isToday,
            color: habit.color
          )
        }
      }
    }
    .padding(.vertical, 2)
  }
}

struct DayCell: View {
  let completed: Bool
  let isToday: Bool
  let color: String

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: 3)
        .fill(cellColor)
        .frame(width: 14, height: 14)
        .overlay(
          RoundedRectangle(cornerRadius: 3)
            .stroke(isToday ? Color.primary : .clear, lineWidth: isToday ? 1 : 0)
        )
    }
  }

  private var cellColor: Color {
    if completed {
      return Color(hex: color) ?? .green
    }
    return Color(.systemGray5)
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
