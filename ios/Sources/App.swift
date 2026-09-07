import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    // Android sets FLAG_SECURE because a checkup result is exactly what a
    // watcher wants a thumbnail of. iOS cannot run that checkup at all (no
    // permission exists to list installed apps, admins, or accessibility
    // services), so this screen never shows a result. It still names
    // "stalkerware" and the hotline in plain text, and for the person this
    // app is for, a task-switcher glimpse of those words is its own risk.
    // The shield covers the window whenever the app leaves the foreground.
    private let shield = UIVisualEffectView(effect: UIBlurEffect(style: .systemMaterial))

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = ViewController()
        window.makeKeyAndVisible()
        self.window = window
        excludeWebKitDataFromBackup()
        return true
    }

    // Sweep keeps only a language preference, not a vault of anything
    // sensitive, so this is belt-and-suspenders rather than the load-bearing
    // fix it would be for an app with real user data. Still worth doing: an
    // iCloud or iTunes backup is a copy that outlives "Leave fast", and
    // consistency here means the same rule applies everywhere it matters.
    private func excludeWebKitDataFromBackup() {
        guard let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        var webKitDir = library.appendingPathComponent("WebKit", isDirectory: true)
        // WebKit creates this lazily on first use, so it may not exist yet
        // this launch; create it up front rather than skip the exclusion,
        // so a fresh install is covered from its very first backup too.
        try? FileManager.default.createDirectory(at: webKitDir, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? webKitDir.setResourceValues(values)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        guard let window, shield.superview == nil else { return }
        shield.frame = window.bounds
        shield.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(shield)
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        shield.removeFromSuperview()
    }
}
