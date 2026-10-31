import Foundation
import UIKit
import React

/// Native bridge for the alternate Home Screen icon ("Dark Neumorphic").
///
/// The selected icon name is mirrored into UserDefaults so AppDelegate can
/// theme the launch experience before React Native loads — iOS cannot swap
/// `UILaunchStoryboardName` at runtime, so the launch overlay is driven from
/// this stored value instead. iOS itself also persists the active icon across
/// launches; the UserDefaults copy only exists for that launch theming.
@objc(AppIconModule)
class AppIconModule: NSObject {

  /// UserDefaults key read by AppDelegate at cold start ('' = primary icon).
  static let defaultsKey = "selectedAppIcon"
  /// Name of the alternate app icon set in Images.xcassets.
  static let darkIconName = "AppIcon-Dark"
  /// Dark Neumorphic background (#1E1E1E) — mirrors themes.ts `dark.background`.
  static let darkLaunchColor = UIColor(
    red: 0.118, green: 0.118, blue: 0.118, alpha: 1.0
  )

  /// Switch the Home Screen icon. Pass `nil` (or an empty string) to revert
  /// to the primary icon. Resolves with the applied name ('default' when
  /// reverted), rejects when the system refuses the change.
  @objc
  func setIcon(
    _ name: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard UIApplication.shared.supportsAlternateIcons else {
        reject(
          "E_UNSUPPORTED",
          "Alternate app icons are not supported on this device",
          nil
        )
        return
      }

      let target: String? = (name?.isEmpty ?? true) ? nil : name

      // Skip no-op calls: switching to the icon that is already active still
      // triggers iOS's "You have changed the icon" alert, which must not
      // reappear on every launch during JS reconciliation.
      guard UIApplication.shared.alternateIconName != target else {
        UserDefaults.standard.set(target ?? "", forKey: Self.defaultsKey)
        resolve(target ?? "default")
        return
      }

      UIApplication.shared.setAlternateIconName(target) { error in
        DispatchQueue.main.async {
          if let error = error {
            reject("E_ICON_CHANGE", error.localizedDescription, error)
            return
          }
          UserDefaults.standard.set(target ?? "", forKey: Self.defaultsKey)
          resolve(target ?? "default")
        }
      }
    }
  }

  /// The stored choice as of the last successful change ('' = primary icon).
  @objc
  func getIcon(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(UserDefaults.standard.string(forKey: Self.defaultsKey) ?? "")
  }

  /// Called by JS once the themed React root is on screen — fades out the
  /// native launch overlay installed by AppDelegate.
  @objc
  func hideLaunchOverlay() {
    DispatchQueue.main.async {
      AppDelegate.hideLaunchOverlay()
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
