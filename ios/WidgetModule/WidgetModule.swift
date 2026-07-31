import Foundation
import React
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {

  private let appGroup = "group.com.codethenic.habita.widget"
  private let selectedIdsKey = "selectedWidgetHabitIds"
  private let selectedYearHabitIdKey = "yearWidgetHabitId"
  private let habitDataKey = "widgetHabitData"

  private var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: appGroup)
  }

  @objc
  func setSelectedHabitIds(_ ids: [String]) {
    sharedDefaults?.set(ids, forKey: selectedIdsKey)
    reloadWidget()
  }

  @objc
  func getSelectedHabitIds(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let ids = sharedDefaults?.stringArray(forKey: selectedIdsKey) ?? []
    resolve(ids)
  }

  @objc
  func setSelectedYearHabitId(_ id: String) {
    sharedDefaults?.set(id, forKey: selectedYearHabitIdKey)
    reloadWidget()
  }

  @objc
  func getSelectedYearHabitId(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let id = sharedDefaults?.string(forKey: selectedYearHabitIdKey) ?? ""
    resolve(id)
  }

  @objc
  func updateWidgetData(_ jsonString: String) {
    sharedDefaults?.set(jsonString, forKey: habitDataKey)
    reloadWidget()
  }

  @objc
  func reloadWidget() {
    if #available(iOS 14, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
