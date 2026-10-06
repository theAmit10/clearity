import SwiftUI
import WidgetKit

// MARK: - Lock Screen circular widget
//
// One habit's progress ring for the Lock Screen / StandBy. Shows the first
// habit from the Today Rings selection (same fallback as the Home widget)
// and toggles today via the shared ToggleHabitIntent — no new data
// plumbing, no JS changes. Note: the Lock Screen renders accessory
// widgets tinted/monochrome; StandBy shows full color.

struct LockRingEntry: TimelineEntry {
  let date: Date
  let ring: RingsSnapshotHabit?
}

struct LockRingProvider: TimelineProvider {
  func placeholder(in context: Context) -> LockRingEntry {
    LockRingEntry(date: Date(), ring: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (LockRingEntry) -> Void) {
    completion(loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<LockRingEntry>) -> Void) {
    let entry = loadEntry()
    let cal = Calendar.current
    let tomorrow = cal.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    let timeline = Timeline(entries: [entry], policy: .after(cal.startOfDay(for: tomorrow)))
    completion(timeline)
  }

  private func loadEntry() -> LockRingEntry {
    let (rings, _) = RingsStore.snapshot()
    return LockRingEntry(date: Date(), ring: rings.first)
  }
}

struct CircularRingWidget: Widget {
  let kind: String = "CircularRing"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LockRingProvider()) { entry in
      LockRingEntryView(entry: entry)
    }
    .configurationDisplayName("Today Ring")
    .description("Today's progress for your top habit. Tap to complete.")
    .supportedFamilies([.accessoryCircular])
  }
}

struct LockRingEntryView: View {
  var entry: LockRingEntry

  private var ringColor: Color {
    guard let ring = entry.ring else {
      return Color(hex: "#9E9E9E")!
    }
    return Color(hex: ring.colorHex) ?? Color(hex: "#E8E8E8")!
  }

  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      if let ring = entry.ring {
        Button(intent: ToggleHabitIntent(habitId: ring.id)) {
          ZStack {
            Circle()
              .stroke(ringColor.opacity(0.28), lineWidth: 6)
            if ring.progress > 0 {
              Circle()
                .trim(from: 0, to: min(1, max(ring.progress, 0.03)))
                .stroke(
                  ringColor,
                  style: StrokeStyle(lineWidth: 6, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
            }
            if let symbol = HabitIconMapper.symbol(for: ring.iconKey) {
              Image(systemName: symbol)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(ringColor)
            } else {
              Text(String(ring.name.prefix(1)).uppercased())
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(ringColor)
            }
          }
        }
        .buttonStyle(.plain)
      } else {
        Image(systemName: "circle.dotted")
          .font(.system(size: 22))
          .foregroundColor(Color(hex: "#9E9E9E"))
      }
    }
  }
}
