import UIKit
import Capacitor

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Handle deep links: adventure://show/{id}/{season}/{episode}
        if url.scheme == "adventure" {
            NotificationCenter.default.post(name: NSNotification.Name("deepLink"), object: url.absoluteString)
            return true
        }
        return CAPBridge.handleOpenUrl(url, options)
    }
}
