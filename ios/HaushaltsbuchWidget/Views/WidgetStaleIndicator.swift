import SwiftUI

/// Kleiner "Zuletzt aktualisiert: vor X Min"-Hinweis, wenn die angezeigten Daten
/// aus dem Cache stammen (eigener Live-Fetch ist fehlgeschlagen) statt frisch geladen zu sein.
struct WidgetStaleIndicator: View {
    let generatedAt: Date

    private var minutesAgo: Int {
        max(0, Int(Date().timeIntervalSince(generatedAt) / 60))
    }

    var body: some View {
        Label("Zuletzt aktualisiert: vor \(minutesAgo) Min", systemImage: "exclamationmark.arrow.triangle.2.circlepath")
            .font(.system(size: 9))
            .foregroundStyle(.orange)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
    }
}
