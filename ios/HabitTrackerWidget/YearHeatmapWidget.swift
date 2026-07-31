import WidgetKit
import SwiftUI

// MARK: - Dark palette (mirrors the app's "Dark Neumorphic" theme)

struct YearHeatmapColors {
  static let background = Color(hex: "#1E1E1E")!
  static let insetFill = Color(hex: "#252525")!
  static let shadowLight = Color(hex: "#2C2C2C")!
  static let shadowDark = Color(hex: "#0F0F0F")!
  static let textPrimary = Color(hex: "#E8E8E8")!
  static let textMuted = Color(hex: "#9E9E9E")!
}

// MARK: - Timeline Entry

struct YearHeatmapEntry: TimelineEntry {
  let date: Date
  let habit: WidgetHabitData?
  let weekDates: [[String]]
  let monthLabels: [(text: String, col: Int)]
  let todayKey: String
  let year: Int
}

// MARK: - Grid builder (mirrors the JS yearWeeks in YearHeatmap.tsx)

enum YearGridBuilder {

  static func weekDateKeys(year: Int) -> [[String]] {
    let cal = Calendar.current
    var cursor = cal.date(from: DateComponents(year: year, month: 1, day: 1)) ?? Date()
    let weekday = cal.component(.weekday, from: cursor) // 1 = Sunday
    if let back = cal.date(byAdding: .day, value: -(weekday - 1), to: cursor) {
      cursor = back
    }
    let end = cal.date(from: DateComponents(year: year, month: 12, day: 31)) ?? Date()
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.timeZone = TimeZone.current

    var weeks: [[String]] = []
    while cursor <= end {
      var week: [String] = []
      for d in 0..<7 {
        if let day = cal.date(byAdding: .day, value: d, to: cursor) {
          week.append(fmt.string(from: day))
        }
      }
      weeks.append(week)
      if let next = cal.date(byAdding: .day, value: 7, to: cursor) {
        cursor = next
      }
    }
    return weeks
  }

  static func monthLabels(weeks: [[String]]) -> [(text: String, col: Int)] {
    let names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.timeZone = TimeZone.current

    var labels: [(text: String, col: Int)] = []
    var lastMonth = -1
    var lastYear = 0
    for (i, week) in weeks.enumerated() {
      guard week.count > 3, let d = fmt.date(from: week[3]) else { continue }
      let m = Calendar.current.component(.month, from: d)
      let y = Calendar.current.component(.year, from: d)
      if m != lastMonth || y != lastYear {
        labels.append((names[m - 1], i))
        lastMonth = m
        lastYear = y
      }
    }
    return labels
  }

  static func todayKeyString() -> String {
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.timeZone = TimeZone.current
    return fmt.string(from: Date())
  }
}

// MARK: - Timeline Provider

struct YearHeatmapProvider: TimelineProvider {

  private let appGroup = "group.com.codethenic.habita.widget"
  private let selectedYearHabitIdKey = "yearWidgetHabitId"
  private let habitDataKey = "widgetHabitData"

  func placeholder(in context: Context) -> YearHeatmapEntry {
    emptyEntry()
  }

  func getSnapshot(in context: Context, completion: @escaping (YearHeatmapEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<YearHeatmapEntry>) -> Void) {
    let entry = loadEntry()
    let timeline = Timeline(entries: [entry], policy: .after(nextRefreshDate()))
    completion(timeline)
  }

  private func loadEntry() -> YearHeatmapEntry {
    let year = Calendar.current.component(.year, from: Date())
    let weeks = YearGridBuilder.weekDateKeys(year: year)
    let labels = YearGridBuilder.monthLabels(weeks: weeks)

    guard let defaults = UserDefaults(suiteName: appGroup) else {
      return emptyEntry(weeks: weeks, labels: labels, year: year)
    }

    let selectedId = defaults.string(forKey: selectedYearHabitIdKey) ?? ""
    let habitDataJson = defaults.string(forKey: habitDataKey)

    guard !selectedId.isEmpty,
          let json = habitDataJson,
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(WidgetDataPayload.self, from: data)
    else {
      return emptyEntry(weeks: weeks, labels: labels, year: year)
    }

    let habit = payload.habits.first { $0.id == selectedId }

    return YearHeatmapEntry(
      date: Date(),
      habit: habit,
      weekDates: weeks,
      monthLabels: labels,
      todayKey: YearGridBuilder.todayKeyString(),
      year: year
    )
  }

  private func emptyEntry(
    weeks: [[String]] = [],
    labels: [(text: String, col: Int)] = [],
    year: Int = Calendar.current.component(.year, from: Date())
  ) -> YearHeatmapEntry {
    let wk = weeks.isEmpty ? YearGridBuilder.weekDateKeys(year: year) : weeks
    let lb = labels.isEmpty ? YearGridBuilder.monthLabels(weeks: wk) : labels
    return YearHeatmapEntry(
      date: Date(),
      habit: nil,
      weekDates: wk,
      monthLabels: lb,
      todayKey: YearGridBuilder.todayKeyString(),
      year: year
    )
  }

  private func nextRefreshDate() -> Date {
    let cal = Calendar.current
    let tomorrow = cal.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    return cal.startOfDay(for: tomorrow)
  }
}

// MARK: - Widget

struct YearHeatmapWidget: Widget {
  let kind: String = "YearHeatmap"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: YearHeatmapProvider()) { entry in
      YearHeatmapEntryView(entry: entry)
    }
    .configurationDisplayName("Year Heatmap")
    .description("Shows a full year of completions for one habit.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

// MARK: - Entry View

struct YearHeatmapEntryView: View {
  var entry: YearHeatmapEntry
  @Environment(\.widgetFamily) var family

  var body: some View {
    GeometryReader { geo in
      VStack(spacing: 6) {
        header
        if entry.habit != nil {
          grid(width: geo.size.width)
        } else {
          emptyState
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    .padding(12)
    .containerBackground(YearHeatmapColors.background, for: .widget)
  }

  private var header: some View {
    HStack(spacing: 5) {
      if let habit = entry.habit {
        Circle()
          .fill(Color(hex: habit.color) ?? YearHeatmapColors.textPrimary)
          .frame(width: 8, height: 8)
        Text(habit.name)
          .font(.system(size: family == .systemLarge ? 13 : 11, weight: .semibold))
          .foregroundColor(YearHeatmapColors.textPrimary)
          .lineLimit(1)
      } else {
        Image(systemName: "square.grid.3x3.topleft.filled")
          .font(.system(size: 11))
          .foregroundColor(YearHeatmapColors.textMuted)
        Text("No habit selected")
          .font(.system(size: 11, weight: .medium))
          .foregroundColor(YearHeatmapColors.textMuted)
      }
      Spacer()
    }
  }

  private var emptyState: some View {
    VStack(spacing: 5) {
      Image(systemName: "hand.tap")
        .font(.system(size: 15))
        .foregroundColor(YearHeatmapColors.textMuted)
      Text("Select a habit in the app")
        .font(.system(size: 10))
        .foregroundColor(YearHeatmapColors.textMuted)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private func grid(width: CGFloat) -> some View {
    let weekCount = max(1, entry.weekDates.count)
    let weekdayCol: CGFloat = 12
    let side = min(6, max(3, floor((width - weekdayCol - 6) / CGFloat(weekCount))))
    let cell = max(2, side - 1)
    let height = side * 7

    return HStack(alignment: .top, spacing: 4) {
      VStack(spacing: 0) {
        ForEach(0..<7, id: \.self) { di in
          let label = ["", "Mon", "", "Wed", "", "Fri", ""][di]
          Group {
            if label.isEmpty {
              Color.clear
            } else {
              Text(label)
                .font(.system(size: 6.5, weight: .bold))
                .foregroundColor(YearHeatmapColors.textMuted)
            }
          }
          .frame(width: weekdayCol, height: side, alignment: .trailing)
        }
      }
      .frame(height: height)

      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 0) {
          ForEach(0..<weekCount, id: \.self) { wi in
            Group {
              if let label = entry.monthLabels.first(where: { $0.col == wi }) {
                Text(label.text)
                  .font(.system(size: 6.5, weight: .bold))
                  .foregroundColor(YearHeatmapColors.textMuted)
              } else {
                Color.clear
              }
            }
            .frame(width: side, alignment: .leading)
          }
        }

        VStack(spacing: 0) {
          ForEach(0..<7, id: \.self) { di in
            HStack(spacing: 0) {
              ForEach(0..<weekCount, id: \.self) { wi in
                cellView(wi: wi, di: di, side: side, cell: cell)
              }
            }
          }
        }
      }
    }
  }

  private func cellView(wi: Int, di: Int, side: CGFloat, cell: CGFloat) -> some View {
    let dateKey =
      (wi < entry.weekDates.count && di < entry.weekDates[wi].count)
        ? entry.weekDates[wi][di]
        : ""
    let isInYear = dateKey.hasPrefix("\(entry.year)-")
    let isFuture = dateKey > entry.todayKey
    let done = entry.habit != nil && ((entry.habit!.completions[dateKey] ?? 0) > 0)
    let habitColor =
      entry.habit.flatMap { Color(hex: $0.color) } ?? YearHeatmapColors.textPrimary

    let fill: Color =
      !isInYear ? Color.clear
      : isFuture ? YearHeatmapColors.background
      : done ? habitColor
      : YearHeatmapColors.insetFill

    return RoundedRectangle(cornerRadius: 1.5)
      .fill(fill)
      .frame(width: cell, height: cell)
      .overlay(
        RoundedRectangle(cornerRadius: 1.5)
          .stroke(
            isInYear && !isFuture && !done
              ? YearHeatmapColors.shadowDark.opacity(0.45)
              : Color.clear,
            lineWidth: 0.5
          )
      )
      .frame(width: side, height: side)
  }
}
