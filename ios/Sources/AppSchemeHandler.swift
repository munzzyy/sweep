import WebKit

// Serves the bundled web app on sweep://localhost the way the Android
// wrapper's WebViewAssetLoader serves it on appassets.androidplatform.net:
// every byte the page loads comes out of the app bundle.
//
// The host string "localhost" is load-bearing twice over. WebKit's
// secure-context check trusts any origin whose host is literally
// "localhost" regardless of scheme, and that trust is what makes this a
// valid secure context for the page's own web APIs (Capacitor ships
// capacitor://localhost for the same reason; Sweep itself does not use
// crypto.subtle or IndexedDB today, so this is future-proofing, not a
// dependency anything currently relies on). And scheme+host is the storage
// origin: change either and the one thing Sweep persists, the sweep-locale
// language preference, is silently orphaned. sweep://localhost is
// permanent.
//
// This handler injects no bridge object beyond the quick-exit message
// handler (ViewController.swift). globalThis.SweepNative stays undefined
// here on purpose: iOS has no permission that lists installed apps, active
// device admins, or enabled accessibility services, so the checkup Android
// runs cannot exist on this platform at all, not even in a smaller form.
// The page already has a fallback for that: without SweepNative it shows
// the explainer-only mode it also shows in a desktop browser. docs/IOS.md
// says this in full.
//
// iOS has no permission that takes the network away from an app the way
// Android's missing INTERNET permission does. What this wrapper relies on
// instead is two things together: no networking code anywhere in ios/, and
// the meta Content-Security-Policy the page itself ships in index.html,
// which bounds what the page's own script can fetch. Headers set on a
// WKURLSchemeTask response, like the ones respond() sends below, are not a
// substitute for that meta tag: WebKit does not treat scheme-handler
// response headers as CSP. A tapped https link is the one deliberate,
// user-initiated exception, and it opens in Safari (ViewController.swift),
// which does reach the network, by design.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "sweep"
    static let host = "localhost"
    static let start = URL(string: "\(scheme)://\(host)/index.html")!

    private static let mime: [String: String] = [
        "html": "text/html; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "mjs": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "json": "application/json",
        "webmanifest": "application/manifest+json",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "ico": "image/x-icon",
        "txt": "text/plain; charset=utf-8",
        "md": "text/markdown; charset=utf-8",
        "xml": "application/xml",
        "woff2": "font/woff2",
        "wasm": "application/wasm",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == Self.host, url.port == nil,
              let base = Bundle.main.resourceURL?
                  .appendingPathComponent("app", isDirectory: true)
                  .standardizedFileURL
        else {
            task.didFailWithError(URLError(.unsupportedURL))
            return
        }
        var rel = url.path
        if rel.isEmpty || rel == "/" { rel = "/index.html" }
        let file = base.appendingPathComponent(String(rel.dropFirst())).standardizedFileURL
        // Resolve symlinks before the containment check, and resolve it on
        // both sides: a traversal in a crafted URL, or a symlink planted
        // inside the bundle pointing outside it, dies here instead of
        // reading the app container or the wider filesystem.
        let resolvedFile = file.resolvingSymlinksInPath()
        let resolvedBase = base.resolvingSymlinksInPath()
        guard resolvedFile.path.hasPrefix(resolvedBase.path + "/"),
              let data = try? Data(contentsOf: file)
        else {
            respond(task, url: url, status: 404, mime: "text/plain; charset=utf-8", data: Data("not found".utf8))
            return
        }
        let ext = file.pathExtension.lowercased()
        respond(task, url: url, status: 200, mime: Self.mime[ext] ?? "application/octet-stream", data: data)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, mime: String, data: Data) {
        let headers = [
            "Content-Type": mime,
            "Content-Length": String(data.count),
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.badServerResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }
}
