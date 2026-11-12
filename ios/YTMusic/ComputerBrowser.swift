import Foundation
import Network

/// Aynı Wi-Fi'daki bilgisayar uygulamalarını Bonjour ile bulur (QR gerekmez)
struct FoundComputer: Identifiable, Equatable {
    let id: String
    let name: String
    let ip: String
    let port: Int
}

final class ComputerBrowser: ObservableObject {
    @Published private(set) var computers: [FoundComputer] = []
    private var browser: NWBrowser?

    func start() {
        guard browser == nil else { return }
        let b = NWBrowser(for: .bonjourWithTXTRecord(type: "_ytmd._tcp", domain: nil), using: .tcp)
        b.browseResultsChangedHandler = { [weak self] results, _ in
            var seen = Set<String>()
            var list: [FoundComputer] = []
            for r in results {
                guard case let .service(name, _, _, _) = r.endpoint,
                      case let .bonjour(txt) = r.metadata else { continue }
                let d = txt.dictionary
                guard let id = d["id"], let ip = d["ip"], let port = Int(d["port"] ?? ""), port > 0,
                      !seen.contains(id) else { continue }
                seen.insert(id)
                list.append(FoundComputer(id: id, name: name, ip: ip, port: port))
            }
            list.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            DispatchQueue.main.async { self?.computers = list }
        }
        b.stateUpdateHandler = { [weak self] state in
            if case .failed = state {
                DispatchQueue.main.async {
                    self?.browser?.cancel()
                    self?.browser = nil
                    DispatchQueue.main.asyncAfter(deadline: .now() + 5) { self?.start() }
                }
            }
        }
        b.start(queue: .main)
        browser = b
    }

    func stop() {
        browser?.cancel()
        browser = nil
    }
}
