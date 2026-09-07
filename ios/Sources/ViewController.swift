import UIKit
import SafariServices
import WebKit

// One screen: the bundled web app in a WKWebView on the fixed custom-scheme
// origin. The wrapper ships no networking code of its own; what the page can
// load is bounded by the meta Content-Security-Policy the page itself ships
// (app/index.html), not by anything this handler injects.
final class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!

    private static let appBackground = UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0x14 / 255, green: 0x13 / 255, blue: 0x10 / 255, alpha: 1)
            : UIColor(red: 0xf2 / 255, green: 0xf0 / 255, blue: 0xea / 255, alpha: 1)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.appBackground

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(AppSchemeHandler(), forURLScheme: AppSchemeHandler.scheme)
        config.websiteDataStore = .default()
        // The quick-exit bridge: the page posts here, and only here, when
        // Leave fast is pressed. Read-only in spirit: this handler cannot be
        // asked to do anything except the one thing it does.
        config.userContentController.add(self, name: "leaveFast")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsLinkPreview = false
        webView.isOpaque = false
        webView.backgroundColor = Self.appBackground
        // The system text-size setting reaches web content the way Android's
        // textZoom does: scale the page by the user's Dynamic Type factor.
        webView.pageZoom = Self.zoomForCurrentTextSize()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(contentSizeCategoryChanged),
            name: UIContentSizeCategory.didChangeNotification,
            object: nil
        )

        // Pinned to the safe area: app/css has no safe-area handling of its
        // own, so the page never hides under the notch or the home indicator.
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
        ])

        webView.load(URLRequest(url: AppSchemeHandler.start))
    }

    private static func zoomForCurrentTextSize() -> CGFloat {
        UIFontMetrics(forTextStyle: .body).scaledValue(for: 17) / 17
    }

    @objc private func contentSizeCategoryChanged() {
        webView.pageZoom = Self.zoomForCurrentTextSize()
    }

    // Quick exit. The page cannot be trusted to have actually cleared what
    // it showed (a bug elsewhere in the JS should not undo Leave fast), so
    // the wrapper resets the web view to the start URL first: nothing
    // sensitive is left loaded under the shield. Only then does it hand off
    // to Safari, which is what actually backgrounds this app. iOS gives no
    // app a way to close or minimize itself, so backgrounding into a
    // neutral page is the strongest exit this platform allows; docs/IOS.md
    // says so plainly.
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "leaveFast" else { return }
        webView.load(URLRequest(url: AppSchemeHandler.start))
        UIApplication.shared.open(URL(string: "https://weather.com")!, options: [:], completionHandler: nil)
    }

    // The web view only ever navigates inside the bundle; a link out goes to
    // the system's browser view. Gated hard: main-frame https navigations
    // from a real link tap, nothing else. Note this gate is satisfiable by a
    // synthetic element.click() in script, which WebKit also reports as
    // .linkActivated; it is not a defense against the page's own code, only
    // against navigations the page never asked for.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == AppSchemeHandler.scheme {
            decisionHandler(.allow)
            return
        }
        if url.scheme == "https",
           navigationAction.targetFrame?.isMainFrame != false,
           navigationAction.navigationType == .linkActivated {
            present(SFSafariViewController(url: url), animated: true)
        }
        decisionHandler(.cancel)
    }

    // window.open / target=_blank from the page: same rule as above,
    // including the real-tap requirement, and no new web view either way.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url,
           url.scheme == "https",
           navigationAction.navigationType == .linkActivated {
            present(SFSafariViewController(url: url), animated: true)
        }
        return nil
    }
}
