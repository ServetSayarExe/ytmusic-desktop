import SwiftUI
import VisionKit

/// Spotify'daki gibi "nerede çalsın" seçimi: bu iPhone ya da bilgisayar
struct DevicesSheet: View {
    @ObservedObject var model: PlayerModel
    @Environment(\.dismiss) private var dismiss
    @State private var scanning = false
    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    DeviceRow(icon: "iphone", name: "Bu iPhone", detail: nil,
                              selected: model.output == .phone) {
                        model.setOutput(.phone)
                        dismiss()
                    }
                    if model.pcPaired {
                        DeviceRow(icon: "desktopcomputer", name: "Bilgisayar", detail: computerDetail,
                                  selected: model.output == .computer) {
                            model.setOutput(.computer)
                            dismiss()
                        }
                    }
                } header: {
                    Text("Nerede çalsın?")
                }

                Section {
                    Button {
                        errorText = nil
                        scanning = true
                    } label: {
                        Label(model.pcPaired ? "Bilgisayarı yeniden eşleştir" : "Bilgisayarı eşleştir",
                              systemImage: "qrcode.viewfinder")
                    }
                    if model.pcPaired {
                        Button(role: .destructive) {
                            model.unpairComputer()
                        } label: {
                            Label("Eşleşmeyi kaldır", systemImage: "xmark.circle")
                        }
                    }
                } footer: {
                    Text("Bilgisayardaki uygulamada Ayarlar → Telefon kumandası'nı aç ve QR kodu okut. Telefon ile bilgisayar aynı Wi-Fi'de olmalı.")
                }

                if let errorText {
                    Section { Text(errorText).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Cihazlar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Bitti") { dismiss() }
                }
            }
            .sheet(isPresented: $scanning) {
                ScannerSheet { code in
                    scanning = false
                    if model.pairComputer(qr: code) {
                        model.setOutput(.computer)
                        dismiss()
                    } else {
                        errorText = "Bu QR kod tanınmadı. Bilgisayardaki Telefon kumandası QR'ını okut."
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var computerDetail: String {
        guard model.output == .computer else { return "Aynı Wi-Fi'de olmalı" }
        return model.pcConnected ? "Bağlı" : "Bağlanıyor…"
    }
}

private struct DeviceRow: View {
    let icon: String
    let name: String
    let detail: String?
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title3)
                    .frame(width: 30)
                    .foregroundStyle(selected ? Color.green : Color.white.opacity(0.8))
                VStack(alignment: .leading, spacing: 2) {
                    Text(name).foregroundStyle(Color.white.opacity(0.92))
                    if let detail {
                        Text(detail).font(.footnote).foregroundStyle(Color.white.opacity(0.5))
                    }
                }
                Spacer()
                if selected {
                    Image(systemName: "checkmark").foregroundStyle(Color.green)
                }
            }
            .contentShape(Rectangle())
        }
    }
}

// MARK: - QR okuyucu

private struct ScannerSheet: View {
    let onCode: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var manual = ""

    private var canScan: Bool { DataScannerViewController.isSupported && DataScannerViewController.isAvailable }

    var body: some View {
        NavigationStack {
            Group {
                if canScan {
                    QRScannerView(onCode: onCode)
                        .ignoresSafeArea(edges: .bottom)
                        .overlay(alignment: .bottom) {
                            Text("Bilgisayardaki QR kodu çerçeveye al")
                                .font(.callout)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(.ultraThinMaterial, in: Capsule())
                                .padding(.bottom, 40)
                        }
                } else {
                    Form {
                        Section {
                            TextField("http://192.168…/r/…", text: $manual)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .keyboardType(.URL)
                            Button("Bağlan") { onCode(manual) }
                                .disabled(manual.isEmpty)
                        } footer: {
                            Text("Kamera kullanılamıyor. Bilgisayardaki kumanda adresini buraya yaz.")
                        }
                    }
                }
            }
            .navigationTitle("Bilgisayarı eşleştir")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Vazgeç") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

private struct QRScannerView: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let vc = DataScannerViewController(recognizedDataTypes: [.barcode(symbologies: [.qr])],
                                           qualityLevel: .balanced,
                                           isHighlightingEnabled: true)
        vc.delegate = context.coordinator
        DispatchQueue.main.async { try? vc.startScanning() }
        return vc
    }

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ uiViewController: DataScannerViewController, coordinator: Coordinator) {
        uiViewController.stopScanning()
    }

    func makeCoordinator() -> Coordinator { Coordinator(onCode: onCode) }

    @MainActor
    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onCode: (String) -> Void
        private var done = false

        init(onCode: @escaping (String) -> Void) { self.onCode = onCode }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem],
                         allItems: [RecognizedItem]) {
            guard !done else { return }
            for item in addedItems {
                if case .barcode(let code) = item, let text = code.payloadStringValue {
                    done = true
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    dataScanner.stopScanning()
                    onCode(text)
                    return
                }
            }
        }
    }
}
