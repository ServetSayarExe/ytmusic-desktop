import UIKit
import WebKit

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let home = URL(string: "https://music.youtube.com/")!
    private let model: PlayerModel

    init(model: PlayerModel) {
        self.model = model
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) kullanılmıyor") }

    // Uygulama içinde açılacak alan adları; diğer bağlantılar Safari'de açılır
    private let inAppHosts = ["youtube.com", "youtu.be", "ytimg.com", "googlevideo.com",
                              "gstatic.com", "googleusercontent.com", "googleapis.com",
                              "youtube-nocookie.com"]

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsPictureInPictureMediaPlayback = true
        config.websiteDataStore = .default()
        // Google girişinin "güvenli olmayan tarayıcı" demesini önler
        config.applicationNameForUserAgent = "Version/18.0 Mobile/15E148 Safari/604.1"

        if let url = Bundle.main.url(forResource: "inject", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
            config.userContentController.addUserScript(script)
        }
        // Sayfadan çalan şarkı bilgisini almak için köprü
        config.userContentController.add(WeakMessageHandler(self), name: "ytmd")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: guide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: guide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(self, action: #selector(reloadPage(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        model.send = { [weak self] cmd, arg in self?.runCommand(cmd, arg) }
        webView.load(URLRequest(url: home))
    }

    private func runCommand(_ cmd: String, _ arg: Double?) {
        let value = (arg?.isFinite ?? false) ? String(arg!) : "0"
        webView.evaluateJavaScript("window.__ytmdCmd && window.__ytmdCmd('\(cmd)', \(value))", completionHandler: nil)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "ytmd", let d = message.body as? [String: Any] else { return }
        model.update(d)
    }

    @objc private func reloadPage(_ sender: UIRefreshControl) {
        if webView.url == nil { webView.load(URLRequest(url: home)) } else { webView.reload() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { sender.endRefreshing() }
    }

    private func isInApp(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased() else { return true }
        if scheme == "about" || scheme == "blob" || scheme == "data" || scheme == "javascript" { return true }
        guard scheme == "http" || scheme == "https", let host = url.host?.lowercased() else { return false }
        if host.contains("google.") { return true }
        return inAppHosts.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
        let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
        if !isMainFrame || isInApp(url) {
            // Bağlantının resmi YouTube Music uygulamasına atlamasını engeller
            let noAppLink = WKNavigationActionPolicy(rawValue: WKNavigationActionPolicy.allow.rawValue + 2) ?? .allow
            decisionHandler(isMainFrame ? noAppLink : .allow)
        } else {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }

    // MARK: - WKUIDelegate

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            if isInApp(url) { webView.load(URLRequest(url: url)) } else { UIApplication.shared.open(url) }
        }
        return nil
    }
}

/// WKUserContentController betik işleyicisini güçlü tuttuğu için döngüyü kıran ara sınıf
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
