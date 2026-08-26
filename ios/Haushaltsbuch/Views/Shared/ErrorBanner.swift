import SwiftUI

/// Inline-Fehleranzeige statt Absturz – wird z.B. im Dashboard bei Netzwerkfehlern gezeigt.
struct ErrorBanner: View {
    let message: String
    var retry: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .foregroundStyle(.red)
            VStack(alignment: .leading, spacing: 4) {
                Text(message)
                    .font(.footnote)
                if let retry {
                    Button("Erneut versuchen", action: retry)
                        .font(.footnote.bold())
                }
            }
            Spacer()
        }
        .padding(12)
        .background(Color.red.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
    }
}
