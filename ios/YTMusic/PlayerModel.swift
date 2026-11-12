import UIKit
import SwiftUI
import MediaPlayer
import CoreImage

/// Çalan şarkının durumu. Web sayfasından gelir; native oynatıcı, kilit ekranı ve Dynamic Island bunu kullanır.
final class PlayerModel: ObservableObject {
    @Published private(set) var title = ""
    @Published private(set) var artist = ""
    @Published private(set) var album = ""
    @Published private(set) var artwork: UIImage?
    @Published private(set) var backdrop: UIImage?
    @Published private(set) var tint = UIColor(white: 0.13, alpha: 1)
    @Published private(set) var duration: Double = 0
    @Published private(set) var position: Double = 0
    @Published private(set) var isPlaying = false
    @Published var showFull = false
    @Published var showDevices = false

    // Çalınacak yer: bu iPhone ya da bilgisayardaki masaüstü uygulaması
    enum Output { case phone, computer }
    @Published private(set) var output: Output = .phone
    @Published private(set) var pcConnected = false
    @Published private(set) var pcPaired = false
    @Published private(set) var pcVolume: Double = 50

    var hasTrack: Bool { !title.isEmpty }
    var showMini: Bool { hasTrack || output == .computer }

    let remote = RemoteClient()
    private var volHoldUntil = Date.distantPast
    private var remoteQueue: [[String: Any]] = []
    private var volWork: DispatchWorkItem?

    /// Web sayfasına komut gönderir (WebViewController bağlar)
    var send: ((String, Double?) -> Void)?
    /// Tam ekran oynatıcı kapanınca (YouTube'un kendi oynatıcısını da kapatmak için)
    var onClose: (() -> Void)?

    private var artURL = ""
    private var artTask: URLSessionDataTask?
    private var positionStamp = Date()
    private var holdUntil = Date.distantPast
    private static let ciContext = CIContext(options: [.workingColorSpace: NSNull()])

    init() {
        pcPaired = remote.api != nil
        remote.onConnection = { [weak self] ok in self?.pcConnected = ok }
        remote.onState = { [weak self] st in self?.applyRemote(st) }
        setupRemoteCommands()
    }

    /// Yumuşak ilerleme çubuğu için tahmini anlık konum
    var livePosition: Double {
        guard isPlaying else { return position }
        let p = position + Date().timeIntervalSince(positionStamp)
        return duration > 0 ? min(p, duration) : p
    }

    // MARK: - Web'den gelen durum

    /// Telefondaki web sayfasından gelen durum
    func update(_ d: [String: Any]) {
        guard output == .phone else { return }
        apply(title: d["title"] as? String ?? "",
              artist: d["artist"] as? String ?? "",
              album: d["album"] as? String ?? "",
              art: d["art"] as? String ?? "",
              dur: (d["dur"] as? Double) ?? 0,
              pos: (d["pos"] as? Double) ?? 0,
              playing: (d["playing"] as? Bool) ?? false)
    }

    /// Bilgisayardan (kumanda sunucusu) gelen durum
    private func applyRemote(_ s: [String: Any]) {
        guard output == .computer else { return }
        if let v = s["vol"] as? Double, Date() >= volHoldUntil { pcVolume = v }
        if let q = s["queue"] as? [[String: Any]] { remoteQueue = q }
        guard let np = s["np"] as? [String: Any], let t = np["title"] as? String, !t.isEmpty else { return }
        let paused = (np["paused"] as? Bool) ?? true
        let rate = (np["rate"] as? Double) ?? 1
        let cur = (np["currentTime"] as? Double) ?? 0
        let now = (s["now"] as? Double) ?? 0
        let at = (s["at"] as? Double) ?? 0
        let pos = cur + (paused ? 0 : max(0, (now - at) / 1000) * rate)
        let art = (np["artwork"] as? String ?? "")
            .replacingOccurrences(of: #"=w\d+-h\d+"#, with: "=w1200-h1200", options: .regularExpression)
        apply(title: t, artist: np["artist"] as? String ?? "", album: np["album"] as? String ?? "",
              art: art, dur: (np["duration"] as? Double) ?? 0, pos: pos, playing: !paused)
    }

    private func apply(title newTitle: String, artist newArtist: String, album newAlbum: String,
                       art: String, dur: Double, pos: Double, playing: Bool) {
        guard !newTitle.isEmpty else { return }
        if newTitle != title || newArtist != artist {
            withAnimation(.easeInOut(duration: 0.35)) {
                title = newTitle
                artist = newArtist
            }
        }
        album = newAlbum
        duration = dur

        // Kullanıcı az önce bir tuşa bastıysa, gelen eski durum iyimser güncellemeyi geri almasın
        if Date() >= holdUntil {
            position = pos
            positionStamp = Date()
            if playing != isPlaying { isPlaying = playing }
        }

        if art != artURL {
            artURL = art
            loadArtwork(art)
        }
        updateNowPlaying()
    }

    private func clearTrack() {
        withAnimation(.easeInOut(duration: 0.3)) {
            title = ""
            artist = ""
            album = ""
            artwork = nil
            backdrop = nil
            tint = UIColor(white: 0.13, alpha: 1)
        }
        artURL = ""
        duration = 0
        position = 0
        isPlaying = false
        holdUntil = .distantPast
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: - Cihazlar

    func setOutput(_ o: Output) {
        guard o != output else { return }
        if o == .computer {
            guard pcPaired else { return }
            if isPlaying { send?("pause", nil) }   // telefondaki çalmayı durdur
            output = .computer
            clearTrack()
            remote.start()
        } else {
            remote.stop()
            output = .phone
            clearTrack()
        }
    }

    /// QR kod okutulunca; tanınırsa true döner
    func pairComputer(qr: String) -> Bool {
        guard let url = RemoteClient.apiURL(fromQR: qr) else { return false }
        let wasComputer = output == .computer
        remote.pair(url)
        pcPaired = true
        if wasComputer { remote.start() }
        return true
    }

    func unpairComputer() {
        if output == .computer { setOutput(.phone) }
        remote.unpair()
        pcPaired = false
    }

    func appDidBecomeActive() { remote.resume() }

    func setPCVolume(_ v: Double) {
        pcVolume = v
        volHoldUntil = Date().addingTimeInterval(1.5)
        volWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.remote.send("vol", v.rounded()) }
        volWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12, execute: work)
    }

    // MARK: - Komutlar

    func togglePlay() {
        let playing = !isPlaying
        position = livePosition
        positionStamp = Date()
        isPlaying = playing
        holdUntil = Date().addingTimeInterval(output == .computer ? 2.5 : 1.2)
        if output == .computer { remote.send("toggle") } else { send?(playing ? "play" : "pause", nil) }
        updateNowPlaying()
    }

    func next() {
        holdUntil = .distantPast
        if output == .computer {
            remote.send("next")
            showNextFromQueue()
        } else {
            send?("next", nil)
        }
    }

    /// Bilgisayardan onay beklemeden sıradaki şarkıyı hemen göster (gerçek durum birazdan gelir)
    private func showNextFromQueue() {
        guard let n = remoteQueue.first, let t = n["title"] as? String, !t.isEmpty else { return }
        remoteQueue.removeFirst()
        let art = (n["art"] as? String ?? "")
            .replacingOccurrences(of: #"=w\d+-h\d+"#, with: "=w1200-h1200", options: .regularExpression)
        var dur: Double = 0
        if let len = n["len"] as? String {
            dur = len.split(separator: ":").reduce(0) { $0 * 60 + (Double($1) ?? 0) }
        }
        apply(title: t, artist: n["artist"] as? String ?? "", album: "", art: art, dur: dur, pos: 0, playing: true)
        position = 0
        positionStamp = Date()
        isPlaying = true
        holdUntil = Date().addingTimeInterval(1.5)
        updateNowPlaying()
    }

    func previous() {
        holdUntil = .distantPast
        if output == .computer { remote.send("prev") } else { send?("prev", nil) }
    }

    func seek(to t: Double) {
        position = max(0, min(t, duration))
        positionStamp = Date()
        holdUntil = Date().addingTimeInterval(output == .computer ? 2.5 : 1.2)
        if output == .computer { remote.send("seek", position.rounded()) } else { send?("seek", position) }
        updateNowPlaying()
    }

    func open() {
        guard hasTrack else { return }
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        showFull = true
    }

    func close() {
        showFull = false
        if output == .phone { onClose?() }
    }

    // MARK: - Kapak ve renk

    private func loadArtwork(_ s: String) {
        artTask?.cancel()
        guard let url = URL(string: s) else { return }
        artTask = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let self, let data, let img = UIImage(data: data) else { return }
            let color = PlayerModel.averageColor(img)?.calm ?? UIColor(white: 0.13, alpha: 1)
            let blurred = PlayerModel.makeBackdrop(img)
            DispatchQueue.main.async {
                guard s == self.artURL else { return }
                withAnimation(.easeInOut(duration: 0.7)) {
                    self.artwork = img
                    self.backdrop = blurred
                    self.tint = color
                }
                self.updateNowPlaying()
            }
        }
        artTask?.resume()
    }

    private static func averageColor(_ img: UIImage) -> UIColor? {
        guard let ci = CIImage(image: img),
              let out = CIFilter(name: "CIAreaAverage",
                                 parameters: [kCIInputImageKey: ci, kCIInputExtentKey: CIVector(cgRect: ci.extent)])?.outputImage
        else { return nil }
        var px = [UInt8](repeating: 0, count: 4)
        ciContext.render(out, toBitmap: &px, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                         format: .RGBA8, colorSpace: nil)
        return UIColor(red: CGFloat(px[0]) / 255, green: CGFloat(px[1]) / 255, blue: CGFloat(px[2]) / 255, alpha: 1)
    }

    /// Arka plan için küçük, bulanık kapak (her karede bulanıklaştırmak yerine bir kez hazırlanır)
    private static func makeBackdrop(_ img: UIImage) -> UIImage? {
        let side: CGFloat = 96
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: side, height: side))
        let small = renderer.image { _ in img.draw(in: CGRect(x: 0, y: 0, width: side, height: side)) }
        guard let ci = CIImage(image: small) else { return nil }
        let blurred = ci.clampedToExtent().applyingGaussianBlur(sigma: 10).cropped(to: ci.extent)
        guard let cg = ciContext.createCGImage(blurred, from: ci.extent) else { return nil }
        return UIImage(cgImage: cg)
    }

    // MARK: - Kilit ekranı ve Dynamic Island

    private func updateNowPlaying() {
        guard hasTrack else { return }
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyPlaybackDuration: duration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: livePosition,
            MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? 1.0 : 0.0,
            MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue
        ]
        if !album.isEmpty { info[MPMediaItemPropertyAlbumTitle] = album }
        if let img = artwork {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: img.size) { _ in img }
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func setupRemoteCommands() {
        let c = MPRemoteCommandCenter.shared()
        c.playCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if !self.isPlaying { self.togglePlay() }
            return .success
        }
        c.pauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            if self.isPlaying { self.togglePlay() }
            return .success
        }
        c.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.togglePlay()
            return .success
        }
        c.nextTrackCommand.addTarget { [weak self] _ in
            self?.next()
            return .success
        }
        c.previousTrackCommand.addTarget { [weak self] _ in
            self?.previous()
            return .success
        }
        c.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self, let e = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self.seek(to: e.positionTime)
            return .success
        }
    }
}

private extension UIColor {
    /// Göz yormayan ton: koyu ve fazla doygun olmayan
    var calm: UIColor {
        var h: CGFloat = 0, s: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard getHue(&h, saturation: &s, brightness: &b, alpha: &a) else { return self }
        return UIColor(hue: h, saturation: min(s, 0.55), brightness: min(max(b, 0.16), 0.30), alpha: 1)
    }
}
