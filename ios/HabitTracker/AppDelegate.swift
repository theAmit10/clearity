import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  /// Full-screen cover in Dark Neumorphic (#1E1E1E) shown from the very first
  /// frame while the alternate icon is active. iOS launches with the system
  /// launch storyboard, which follows *system* appearance rather than the
  /// icon choice and cannot be swapped at runtime — this overlay bridges the
  /// gap until React Native paints the themed root view.
  private static var launchOverlayView: UIView?

  static func hideLaunchOverlay() {
    guard let overlay = launchOverlayView else { return }
    launchOverlayView = nil
    UIView.animate(withDuration: 0.15, animations: {
      overlay.alpha = 0
    }, completion: { _ in
      overlay.removeFromSuperview()
    })
  }

  private func installLaunchOverlayIfNeeded() {
    let selected = UserDefaults.standard.string(
      forKey: AppIconModule.defaultsKey
    ) ?? ""
    guard selected == AppIconModule.darkIconName, let window = window else {
      return
    }
    let overlay = UIView(frame: window.bounds)
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    overlay.backgroundColor = AppIconModule.darkLaunchColor
    window.addSubview(overlay)
    AppDelegate.launchOverlayView = overlay
  }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "Habita",
      in: window,
      launchOptions: launchOptions
    )

    // Dark icon active → cover the launch handoff in Dark Neumorphic until
    // JS confirms the themed root view is up (AppIconModule.hideLaunchOverlay).
    installLaunchOverlayIfNeeded()

    return true
  }

  // Locked-widget tap deep link (habita://paywall?source=widget).
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
