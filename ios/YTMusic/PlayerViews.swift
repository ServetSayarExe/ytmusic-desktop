import SwiftUI
import MediaPlayer

private let textColor = Color.white.opacity(0.92)
private let springy = Animation.spring(response: 0.45, dampingFraction: 0.86)

// MARK: - Kök görünüm

struct RootView: View {
    @ObservedObject var model: PlayerModel
    let web: WebViewController

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            WebContainer(controller: web)
                .safeAreaInset(edge: .bottom, spacing: 0) {
                    if model.showMini {
                        MiniPlayerView(model: model)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }

            if model.showFull {
                FullPlayerView(model: model)
                    .transition(.move(edge: .bottom))
                    .zIndex(1)
            }
        }
        .animation(springy, value: model.showFull)
        .animation(springy, value: model.showMini)
        .preferredColorScheme(.dark)
        .sheet(isPresented: $model.showDevices) {
            DevicesSheet(model: model)
        }
    }
}

struct WebContainer: UIViewControllerRepresentable {
    let controller: WebViewController
    func makeUIViewController(context: Context) -> WebViewController { controller }
    func updateUIViewController(_ uiViewController: WebViewController, context: Context) {}
}

// MARK: - Mini oynatıcı

struct MiniPlayerView: View {
    @ObservedObject var model: PlayerModel

    var body: some View {
        HStack(spacing: 12) {
            ArtworkView(image: model.artwork, corner: 8)
                .frame(width: 46, height: 46)

            VStack(alignment: .leading, spacing: 2) {
                Text(miniTitle)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                HStack(spacing: 5) {
                    if model.output == .computer || !model.hasTrack {
                        Image(systemName: "desktopcomputer")
                            .font(.caption2)
                            .foregroundStyle(Color.green)
                    }
                    Text(miniSubtitle)
                        .font(.footnote)
                        .foregroundStyle(Color.white.opacity(0.6))
                        .lineLimit(1)
                }
            }
            .id(model.title)
            .transition(.opacity)

            Spacer(minLength: 8)

            if model.hasTrack {
                PressButton(system: model.isPlaying ? "pause.fill" : "play.fill", size: 22) { model.togglePlay() }
                PressButton(system: "forward.fill", size: 20) { model.next() }
            } else {
                PressButton(system: "hifispeaker.2", size: 20) { model.showDevices = true }
            }
        }
        .foregroundStyle(textColor)
        .padding(.leading, 10)
        .padding(.trailing, 4)
        .padding(.vertical, 8)
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color(model.tint).opacity(0.6))
            }
        }
        .overlay(alignment: .bottom) {
            MiniProgress(model: model)
                .padding(.horizontal, 18)
                .padding(.bottom, 1)
        }
        .shadow(color: .black.opacity(0.35), radius: 14, y: 4)
        .padding(.horizontal, 10)
        .padding(.top, 6)
        .padding(.bottom, 4)
        .contentShape(Rectangle())
        .onTapGesture { if model.hasTrack { model.open() } else { model.showDevices = true } }
        .gesture(DragGesture(minimumDistance: 12).onEnded { v in
            if v.translation.height < -30 { model.open() }
        })
    }

    private var miniTitle: String {
        if model.hasTrack { return model.title }
        if model.output == .computer { return model.pcName }
        return model.browser.computers.first?.name ?? "Bilgisayar"
    }

    private var miniSubtitle: String {
        if model.output == .computer && !model.hasTrack {
            return model.pcConnected ? "Bağlı · çalan şarkı yok" : "Bağlanıyor…"
        }
        if !model.hasTrack { return "Bağlanmak için dokun" }
        return model.artist
    }
}

private struct MiniProgress: View {
    @ObservedObject var model: PlayerModel

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: !model.isPlaying)) { _ in
            GeometryReader { g in
                let frac = model.duration > 0 ? min(max(model.livePosition / model.duration, 0), 1) : 0
                Capsule()
                    .fill(Color.white.opacity(0.55))
                    .frame(width: g.size.width * frac, height: 2)
            }
            .frame(height: 2)
        }
    }
}

// MARK: - Tam ekran oynatıcı

struct FullPlayerView: View {
    @ObservedObject var model: PlayerModel
    @State private var drag: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let side = max(120, min(geo.size.width - 56, geo.size.height * 0.42))
            ZStack {
                PlayerBackground(model: model)
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    Capsule()
                        .fill(Color.white.opacity(0.35))
                        .frame(width: 40, height: 5)
                        .padding(.top, 8)
                        .onTapGesture { model.close() }

                    Spacer(minLength: 20)

                    ArtworkView(image: model.artwork, corner: 14)
                        .frame(width: side, height: side)
                        .scaleEffect(model.isPlaying ? 1 : 0.82)
                        .shadow(color: .black.opacity(model.isPlaying ? 0.45 : 0.2),
                                radius: model.isPlaying ? 30 : 12, y: model.isPlaying ? 16 : 6)
                        .animation(.spring(response: 0.5, dampingFraction: 0.72), value: model.isPlaying)

                    Spacer(minLength: 20)

                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(model.title)
                                .font(.title3.weight(.semibold))
                                .lineLimit(1)
                            Text(model.artist)
                                .font(.title3)
                                .foregroundStyle(Color.white.opacity(0.6))
                                .lineLimit(1)
                        }
                        .id(model.title)
                        .transition(.opacity)
                        Spacer()
                    }

                    ProgressBar(model: model)
                        .padding(.top, 22)

                    HStack {
                        Spacer()
                        PressButton(system: "backward.fill", size: 30) { model.previous() }
                        Spacer()
                        PressButton(system: model.isPlaying ? "pause.fill" : "play.fill", size: 46) { model.togglePlay() }
                        Spacer()
                        PressButton(system: "forward.fill", size: 30) { model.next() }
                        Spacer()
                    }
                    .padding(.vertical, 22)

                    HStack(spacing: 12) {
                        Image(systemName: "speaker.fill").font(.caption)
                        if model.output == .computer {
                            Slider(value: Binding(get: { model.pcVolume },
                                                  set: { model.setPCVolume($0) }),
                                   in: 0...100)
                                .tint(Color.white.opacity(0.8))
                                .frame(height: 30)
                        } else {
                            VolumeSlider().frame(height: 30)
                        }
                        Image(systemName: "speaker.wave.3.fill").font(.caption)
                    }
                    .foregroundStyle(Color.white.opacity(0.55))

                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        model.showDevices = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: model.output == .computer ? "desktopcomputer" : "hifispeaker.2")
                            Text(model.output == .computer ? "Bilgisayarda çalıyor" : "Bu iPhone")
                                .font(.footnote.weight(.medium))
                        }
                        .foregroundStyle(model.output == .computer ? Color.green : Color.white.opacity(0.6))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Capsule().fill(Color.white.opacity(0.08)))
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 18)

                    Spacer(minLength: 20)
                }
                .padding(.horizontal, 28)
                .foregroundStyle(textColor)
            }
            .offset(y: max(drag, 0))
            .gesture(
                DragGesture(minimumDistance: 10)
                    .onChanged { v in drag = v.translation.height }
                    .onEnded { v in
                        if v.translation.height > 140 || v.predictedEndTranslation.height > 420 {
                            model.close()
                        } else {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { drag = 0 }
                        }
                    }
            )
        }
    }
}

private struct PlayerBackground: View {
    @ObservedObject var model: PlayerModel

    var body: some View {
        ZStack {
            Color(model.tint)
            if let img = model.backdrop {
                GeometryReader { g in
                    Image(uiImage: img)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFill()
                        .frame(width: g.size.width, height: g.size.height)
                        .clipped()
                        .opacity(0.55)
                        .saturation(0.85)
                }
                .transition(.opacity)
            }
            LinearGradient(colors: [Color.black.opacity(0.10), Color.black.opacity(0.60)],
                           startPoint: .top, endPoint: .bottom)
        }
    }
}

// MARK: - İlerleme çubuğu

private struct ProgressBar: View {
    @ObservedObject var model: PlayerModel
    @State private var dragValue: Double?

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 60, paused: !model.isPlaying || dragValue != nil)) { _ in
            let dur = max(model.duration, 0.1)
            let cur = dragValue ?? model.livePosition
            VStack(spacing: 8) {
                GeometryReader { g in
                    let w = max(g.size.width, 1)
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.18))
                        Capsule()
                            .fill(Color.white.opacity(dragValue == nil ? 0.7 : 0.95))
                            .frame(width: w * min(max(cur / dur, 0), 1))
                    }
                    .frame(height: dragValue == nil ? 6 : 11)
                    .frame(maxHeight: .infinity)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { v in dragValue = min(max(Double(v.location.x / w), 0), 1) * dur }
                            .onEnded { _ in
                                if let d = dragValue { model.seek(to: d) }
                                dragValue = nil
                            }
                    )
                    .animation(.spring(response: 0.3, dampingFraction: 0.8), value: dragValue == nil)
                }
                .frame(height: 24)

                HStack {
                    Text(timeText(cur))
                    Spacer()
                    Text("-" + timeText(max(dur - cur, 0)))
                }
                .font(.caption.monospacedDigit())
                .foregroundStyle(Color.white.opacity(0.55))
            }
        }
    }

    private func timeText(_ t: Double) -> String {
        guard t.isFinite else { return "0:00" }
        let s = Int(t.rounded(.down))
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

// MARK: - Ortak parçalar

struct ArtworkView: View {
    let image: UIImage?
    var corner: CGFloat = 14

    var body: some View {
        Color.white.opacity(0.08)
            .overlay {
                if let image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .transition(.opacity)
                } else {
                    Image(systemName: "music.note")
                        .font(.system(size: 26))
                        .foregroundStyle(Color.white.opacity(0.4))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
    }
}

struct PressButton: View {
    let system: String
    let size: CGFloat
    let action: () -> Void

    var body: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            action()
        } label: {
            Image(systemName: system)
                .font(.system(size: size, weight: .regular))
                .symbolSwap()
                .frame(width: size * 1.8, height: size * 1.8)
                .contentShape(Rectangle())
        }
        .buttonStyle(PressStyle())
    }
}

private struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(Circle().fill(Color.white.opacity(configuration.isPressed ? 0.12 : 0)))
            .scaleEffect(configuration.isPressed ? 0.86 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

private extension View {
    @ViewBuilder func symbolSwap() -> some View {
        if #available(iOS 17.0, *) {
            self.contentTransition(.symbolEffect(.replace))
        } else {
            self
        }
    }
}

private struct VolumeSlider: UIViewRepresentable {
    func makeUIView(context: Context) -> MPVolumeView {
        let v = MPVolumeView(frame: .zero)
        v.tintColor = UIColor(white: 1, alpha: 0.8)
        return v
    }
    func updateUIView(_ uiView: MPVolumeView, context: Context) {}
}
