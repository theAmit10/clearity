import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Intent (iOS 17+ interactive widget)

struct ToggleHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Toggle habit"

  @Parameter(title: "Habit")
  var habitId: String

  init() {
    habitId = ""
  }

  init(habitId: String) {
    self.habitId = habitId
  }

  func perform() async throws -> some IntentResult {
    if !habitId.isEmpty {
      RingsStore.toggle(habitId: habitId)
    }
    return .result()
  }
}

// MARK: - Timeline

struct RingsEntry: TimelineEntry {
  let date: Date
  let rings: [RingsSnapshotHabit]
  /// True when the user cleared their rings selection (show setup hint).
  let showSetupHint: Bool
  /// True when widgets are Pro-gated (render the upsell card).
  let showProGate: Bool
  /// True when the gate is Renew (expired) vs Upgrade (never Pro).
  let proExpired: Bool
}

struct RingsProvider: TimelineProvider {
  func placeholder(in context: Context) -> RingsEntry {
    RingsEntry(date: Date(), rings: [], showSetupHint: false, showProGate: false, proExpired: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (RingsEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<RingsEntry>) -> Void) {
    let entry = loadEntry()
    let cal = Calendar.current
    let tomorrow = cal.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    let timeline = Timeline(entries: [entry], policy: .after(cal.startOfDay(for: tomorrow)))
    completion(timeline)
  }

  private func loadEntry() -> RingsEntry {
    let (rings, configured, locked, expired) = RingsStore.snapshot()
    // Never-configured + no data, or explicitly emptied selection -> hint.
    // First-run fallback in RingsStore.snapshot covers never-configured with data.
    return RingsEntry(
      date: Date(),
      rings: rings,
      showSetupHint: configured && rings.isEmpty && !locked,
      showProGate: locked,
      proExpired: expired
    )
  }
}

// MARK: - Widget

struct TodayRingsWidget: Widget {
  let kind: String = "TodayRings"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: RingsProvider()) { entry in
      RingsEntryView(entry: entry)
        .widgetURL(entry.showProGate ? WidgetPaywall.url : nil)
    }
    .configurationDisplayName("Today Rings")
    .description("Tap a ring to complete a habit without opening the app.")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

// MARK: - Views (matches the dark 5x2 ring grid)

struct RingsEntryView: View {
  var entry: RingsEntry
  @Environment(\.widgetFamily) var family

  private var columns: [GridItem] {
    Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)
  }

  /// Floating black card: rounded on top, square on the bottom.
  /// Inset from the widget edges so the system's outer corner mask
  /// doesn't swallow the custom top radius.
  private var cardShape: UnevenRoundedRectangle {
    UnevenRoundedRectangle(
      cornerRadii: RectangleCornerRadii(
        topLeading: 22,
        bottomLeading: 0,
        bottomTrailing: 0,
        topTrailing: 22
      )
    )
  }

  /// Subtle glass sheen: lighter at the top, settling into the card black.
  private var cardFill: LinearGradient {
    LinearGradient(
      colors: [Color(hex: "#2A2A2A")!, Color(hex: "#141414")!],
      startPoint: .top,
      endPoint: .bottom
    )
  }

  var body: some View {
    ZStack {
      cardShape
        .fill(cardFill)
      if entry.showProGate {
        WidgetProLockView(expired: entry.proExpired)
      } else if entry.rings.isEmpty {
        VStack(spacing: 6) {
          Image(systemName: "circle.dotted")
            .font(.system(size: 20))
            .foregroundColor(Color(hex: "#9E9E9E"))
          Text(entry.showSetupHint ? "Select habits in the app" : "No habits yet")
            .font(.system(size: 12, weight: .medium, design: .rounded))
            .foregroundColor(Color(hex: "#9E9E9E"))
        }
      } else {
        LazyVGrid(columns: columns, spacing: family == .systemLarge ? 14 : 10) {
          ForEach(entry.rings.prefix(10), id: \.id) { ring in
            RingCell(ring: ring, showName: family == .systemLarge)
          }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
      }
    }
    .padding(7)
    .containerBackground(.black, for: .widget)
  }
}

struct RingCell: View {
  let ring: RingsSnapshotHabit
  var showName: Bool = false

  private var ringColor: Color {
    Color(hex: ring.colorHex) ?? Color(hex: "#E8E8E8")!
  }

  var body: some View {
    Button(intent: ToggleHabitIntent(habitId: ring.id)) {
      VStack(spacing: 4) {
        ZStack {
          // Track
          Circle()
            .stroke(ringColor.opacity(0.28), lineWidth: 5)
          // Progress
          if ring.progress > 0 {
            Circle()
              .trim(from: 0, to: min(1, max(ring.progress, 0.03)))
              .stroke(
                ringColor,
                style: StrokeStyle(lineWidth: 5, lineCap: .round)
              )
              .rotationEffect(.degrees(-90))
          }
          // Icon
          if let symbol = HabitIconMapper.symbol(for: ring.iconKey) {
            Image(systemName: symbol)
              .font(.system(size: 17, weight: .semibold))
              .foregroundColor(ring.done ? ringColor : ringColor.opacity(0.85))
          } else {
            Text(String(ring.name.prefix(1)).uppercased())
              .font(.system(size: 16, weight: .bold, design: .rounded))
              .foregroundColor(ringColor)
          }
          // Done veil
          if ring.done {
            Circle()
              .fill(ringColor.opacity(0.12))
          }
        }
        .frame(width: 46, height: 46)
        if showName {
          Text(ring.name)
            .font(.system(size: 9, weight: .medium, design: .rounded))
            .foregroundColor(Color(hex: "#9E9E9E"))
            .lineLimit(1)
            .frame(maxWidth: 64)
        }
      }
    }
    .buttonStyle(.plain)
  }
}
