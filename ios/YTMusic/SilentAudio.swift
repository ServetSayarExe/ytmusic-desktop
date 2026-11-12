import AVFoundation

/// Bilgisayar modunda telefon ses çalmadığı için iOS kilit ekranında ve Dynamic Island'da
/// uygulamayı göstermez. Spotify Connect'teki gibi duyulmayan (tamamen sessiz) bir ses
/// döngüsü çalarak "şu an çalan uygulama" olarak kalırız. Pil etkisi önemsizdir.
final class SilentAudio {
    private var player: AVAudioPlayer?
    private(set) var running = false

    func set(_ on: Bool) {
        if on == running {
            if on, let p = player, !p.isPlaying { p.play() }   // kesintiden (arama vb.) sonra sürdür
            return
        }
        running = on
        if on {
            if player == nil {
                player = try? AVAudioPlayer(data: SilentAudio.makeWav())
                player?.numberOfLoops = -1
                player?.prepareToPlay()
            }
            try? AVAudioSession.sharedInstance().setActive(true)
            player?.play()
        } else {
            player?.pause()
        }
    }

    /// 1 saniyelik, tamamen sessiz WAV (8 kHz, mono, 16 bit)
    private static func makeWav() -> Data {
        let rate: UInt32 = 8000
        let dataSize: UInt32 = rate * 2
        var d = Data()
        func u32(_ v: UInt32) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        d.append(contentsOf: Array("RIFF".utf8)); u32(36 + dataSize); d.append(contentsOf: Array("WAVE".utf8))
        d.append(contentsOf: Array("fmt ".utf8)); u32(16); u16(1); u16(1); u32(rate); u32(rate * 2); u16(2); u16(16)
        d.append(contentsOf: Array("data".utf8)); u32(dataSize)
        d.append(Data(count: Int(dataSize)))
        return d
    }
}
