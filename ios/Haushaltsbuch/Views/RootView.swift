import SwiftUI

/// Entscheidet, ob Onboarding (keine Server-URL/Token) oder die Haupt-App gezeigt wird.
struct RootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        Group {
            if appModel.isBootstrapping {
                LaunchLoadingView()
            } else if appModel.isAuthenticated {
                ContentView()
                    .transition(.opacity)
            } else {
                OnboardingView()
                    .transition(.opacity)
            }
        }
        .animation(.spring(duration: 0.35), value: appModel.isAuthenticated)
        .animation(.spring(duration: 0.35), value: appModel.isBootstrapping)
    }
}

private struct LaunchLoadingView: View {
    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Haushaltsbuch wird geladen …")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
    }
}
