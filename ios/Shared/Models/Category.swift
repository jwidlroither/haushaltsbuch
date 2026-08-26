import Foundation

enum CategoryType: String, Codable {
    case income
    case expense
    case both
}

struct Category: Codable, Identifiable, Equatable {
    let id: String
    let userId: String
    let name: String
    /// Emoji, z.B. "🛒"
    let icon: String
    /// Hex-Farbe wie "#6366f1"
    let color: String
    let type: CategoryType
    let isSystem: Bool

    /// Passt diese Kategorie zum gegebenen Transaktionstyp (für den Kategorie-Picker im Neu-Sheet).
    func matches(_ transactionType: TransactionType) -> Bool {
        switch type {
        case .both: return true
        case .income: return transactionType == .income
        case .expense: return transactionType == .expense
        }
    }
}
