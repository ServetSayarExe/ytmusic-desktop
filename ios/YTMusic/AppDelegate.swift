import UIKit
import SwiftUI
import AVFoundation

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Ekran kilitliyken ve uygulama arka plandayken müziğin çalmaya devam etmesi için
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [])
        try? session.setActive(true)
        return true
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var model: PlayerModel?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let model = PlayerModel()
        self.model = model
        let web = WebViewController(model: model)
        let host = UIHostingController(rootView: RootView(model: model, web: web))
        host.view.backgroundColor = .black
        window.rootViewController = host
        window.overrideUserInterfaceStyle = .dark
        window.makeKeyAndVisible()
        self.window = window
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        model?.appDidBecomeActive()
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        try? AVAudioSession.sharedInstance().setActive(true)
    }
}
