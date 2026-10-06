import SwiftUI
import WidgetKit

@main
struct HabitTrackerWidgetBundle: WidgetBundle {
  var body: some Widget {
    WeekHeatmapWidget()
    TodayRingsWidget()
    CircularRingWidget()
    // YearHeatmapWidget() // TODO: re-enable in a future update
  }
}
