import SwiftUI

/// Runde Kategorie-Kachel mit Emoji-Icon auf farbigem Hintergrund (aus dem API-Hex-Wert).
struct CategoryBadge: View {
    let icon: String
    let colorHex: String
    var size: CGFloat = 36

    var body: some View {
        Circle()
            .fill(Color(hex: colorHex).opacity(0.2))
            .overlay(
                Text(icon)
                    .font(.system(size: size * 0.5))
            )
            .frame(width: size, height: size)
    }
}
