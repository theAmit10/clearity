import Foundation
import React
import WidgetKit

@objc(WidgetModule)
class WidgetModule: NSObject {

  private let appGroup = "group.com.codethenic.habita.widget"
  private let selectedIdsKey = "selectedWidgetHabitIds"
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
