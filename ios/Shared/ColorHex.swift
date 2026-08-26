import SwiftUI

extension Color {
    /// Erzeugt eine Color aus einem Hex-String wie "#6366f1" oder "6366f1".
    /// Unbekannte/ungültige Strings fallen auf ein neutrales Grau zurück,
    /// damit ein kaputter API-Wert die UI nie zum Absturz bringt.
    init(hex: String) {
        var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if sanitized.hasPrefix("#") {
            sanitized.removeFirst()
        }

        guard sanitized.count == 6, let value = UInt64(sanitized, radix: 16) else {
            self = Color.gray
            return
        }

        let r = Double((value & 0xFF0000) >> 16) / 255.0
        let g = Double((value & 0x00FF00) >> 8) / 255.0
        let b = Double(value & 0x0000FF) / 255.0
        self = Color(red: r, green: g, blue: b)
    }
}
