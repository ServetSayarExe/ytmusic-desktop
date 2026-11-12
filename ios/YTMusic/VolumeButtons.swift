import UIKit
import MediaPlayer
import AVFoundation

/// Bilgisayar modunda telefonun yan ses tuşlarını yakalar (Spotify Connect gibi).
/// Telefonun kendi sesi ortada tutulur ki tuşlar uçlarda takılmasın; mod kapanınca eski seviye geri gelir.
final class VolumeButtons {
    var onStep: ((Int) -> Void)?

    private let volumeView = MPVolumeView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
    private var observation: NSKeyValueObservation?
    private var ignoreUntil = Date.distantPast
    private var last: Float = 0.5
    private var savedVolume: Float?
    private(set) var active = false

    /// Görünür bir pencerede bulunan MPVolumeView, iOS'un ses göstergesini gizler
    func attach(to view: UIView) {
        volumeView.alpha = 0.01
        volumeView.isUserInteractionEnabled = false
        view.addSubview(volumeView)
    }

    func setActive(_ on: Bool) {
        guard on != active else { return }
        active = on
        let session = AVAudioSession.sharedInstance()
        if on {
            savedVolume = session.outputVolume
            last = session.outputVolume
            observation = session.observe(\.outputVolume, options: [.new]) { [weak self] s, _ in
                let v = s.outputVolume
                DispatchQueue.main.async { self?.changed(v) }
            }
            setSystemVolume(0.5)
        } else {
            observation?.invalidate()
            observation = nil
            if let v = savedVolume { setSystemVolume(v) }
            savedVolume = nil
        }
    }

    private func changed(_ v: Float) {
        guard active else { return }
        if Date() < ignoreUntil { last = v; return }
        let diff = v - last
        last = v
        guard abs(diff) > 0.001 else { return }
        onStep?(diff > 0 ? 1 : -1)
        if v > 0.85 || v < 0.15 { setSystemVolume(0.5) }
    }

    private func setSystemVolume(_ v: Float) {
        guard let slider = volumeView.subviews.compactMap({ $0 as? UISlider }).first else { return }
        ignoreUntil = Date().addingTimeInterval(0.4)
        DispatchQueue.main.async {
            slider.value = v
            self.last = v
        }
    }
}
