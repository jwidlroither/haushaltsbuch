import SwiftUI

@main
struct HaushaltsbuchApp: App {
    @State private var appModel = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appModel)
                .task {
                    await appModel.bootstrap()
                }
                .onOpenURL { url in
                    handle(url: url)
                }
        }
    }

    /// Verarbeitet haushaltsbuch://new (z.B. vom Home-Screen-Widget getippt).
    private func handle(url: URL) {
        guard url.scheme == DeepLink.scheme else { return }
        if url.host == DeepLink.newTransactionHost {
            appModel.isNewTransactionSheetPresented = true
        }
    }
}
