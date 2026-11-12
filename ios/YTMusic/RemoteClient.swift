import Foundation

/// Bilgisayardaki masaüstü uygulamasının "telefon kumandası" sunucusuna bağlanır (aynı Wi-Fi).
/// Durum: GET <api>/events (Server-Sent Events) · Komut: POST <api>/cmd {"cmd":..., "v":...}
final class RemoteClient: NSObject, URLSessionDataDelegate {
    private(set) var api: URL?
    var onState: (([String: Any]) -> Void)?
    var onConnection: ((Bool) -> Void)?

    private var session: URLSession!
    private var stream: URLSessionDataTask?
    private var buffer = Data()
    private var active = false
    private static let key = "pcAPI"

    override init() {
        super.init()
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForResource = 60 * 60 * 24 * 7
        cfg.waitsForConnectivity = false
        session = URLSession(configuration: cfg, delegate: self, delegateQueue: .main)
        api = UserDefaults.standard.url(forKey: RemoteClient.key)
    }

    /// Masaüstündeki QR kodun adresinden (http://IP:PORT/r/TOKEN) API adresini çıkarır
    static func apiURL(fromQR text: String) -> URL? {
        guard let u = URL(string: text.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = u.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = u.host else { return nil }
        let parts = u.path.split(separator: "/")
        guard parts.count >= 2, parts[0] == "r", parts[1].count == 32 else { return nil }
        var c = URLComponents()
        c.scheme = scheme
        c.host = host
        c.port = u.port
        c.path = "/api/\(parts[1])"
        return c.url
    }

    func pair(_ url: URL) {
        stop()
        api = url
        UserDefaults.standard.set(url, forKey: RemoteClient.key)
    }

    func unpair() {
        stop()
        api = nil
        UserDefaults.standard.removeObject(forKey: RemoteClient.key)
    }

    func start() {
        active = true
        connect()
    }

    func stop() {
        active = false
        stream?.cancel()
        stream = nil
        onConnection?(false)
    }

    /// Uygulama öne gelince bağlantı kopmuşsa yeniden bağlan
    func resume() { if active && stream == nil { connect() } }

    func send(_ cmd: String, _ v: Double? = nil) {
        guard let api else { return }
        var req = URLRequest(url: api.appendingPathComponent("cmd"))
        req.httpMethod = "POST"
        req.timeoutInterval = 5
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: Any] = ["cmd": cmd]
        if let v, v.isFinite { body["v"] = v }
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        session.dataTask(with: req).resume()
    }

    private func connect() {
        guard active, stream == nil, let api else { return }
        var req = URLRequest(url: api.appendingPathComponent("events"))
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 60
        buffer.removeAll()
        let t = session.dataTask(with: req)
        stream = t
        t.resume()
    }

    // MARK: - URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard dataTask === stream else { completionHandler(.allow); return }
        let ok = (response as? HTTPURLResponse)?.statusCode == 200
        if ok { onConnection?(true) }
        completionHandler(ok ? .allow : .cancel)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard dataTask === stream else { return }
        buffer.append(data)
        let separator = Data("\n\n".utf8)
        while let r = buffer.range(of: separator) {
            let chunk = buffer.subdata(in: buffer.startIndex..<r.lowerBound)
            buffer.removeSubrange(buffer.startIndex..<r.upperBound)
            guard let text = String(data: chunk, encoding: .utf8) else { continue }
            let payload = text.split(separator: "\n")
                .filter { $0.hasPrefix("data:") }
                .map { $0.dropFirst(5).trimmingCharacters(in: .whitespaces) }
                .joined(separator: "\n")
            if !payload.isEmpty,
               let obj = (try? JSONSerialization.jsonObject(with: Data(payload.utf8))) as? [String: Any] {
                onState?(obj)
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard task === stream else { return }
        stream = nil
        onConnection?(false)
        if active {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.connect() }
        }
    }
}
