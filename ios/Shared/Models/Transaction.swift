import Foundation

/// Entscheidung für das ganze Projekt: JSON verwendet snake_case (Backend-Konvention),
/// Swift-Typen verwenden camelCase Properties. Die Umwandlung passiert zentral über
/// `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase` bzw.
/// `JSONEncoder.keyEncodingStrategy = .convertToSnakeCase` in APIClient. Die meisten
/// Model-Structs brauchen dadurch keine eigenen `CodingKeys` – `Transaction` hat unten
/// trotzdem ein manuelles `init(from:)`, aber NUR wegen `amount` (siehe
/// FlexibleNumberDecoding.swift: node-postgres liefert DECIMAL-Spalten teils als String).
enum TransactionType: String, Codable, CaseIterable, Identifiable {
    case income
    case expense

    var id: String { rawValue }

    var label: String {
        switch self {
        case .income: return "Einnahme"
        case .expense: return "Ausgabe"
        }
    }
}

enum TransactionStatus: String, Codable {
    case bezahlt
    case ausstehend

    var label: String {
        switch self {
        case .bezahlt: return "Bezahlt"
        case .ausstehend: return "Ausstehend"
        }
    }
}

struct Transaction: Decodable, Identifiable, Equatable {
    let id: String
    let userId: String
    let categoryId: String?
    let type: TransactionType
    let amount: Double
    let description: String?
    /// Format yyyy-MM-dd, wie vom Backend geliefert (kein Zeitanteil).
    let date: String
    let status: TransactionStatus
    let categoryName: String?
    let categoryIcon: String?
    let categoryColor: String?

    private enum CodingKeys: String, CodingKey {
        case id, userId, categoryId, type, amount, description, date, status
        case categoryName, categoryIcon, categoryColor
    }

    // Manuelles Decoding nur wegen `amount` (siehe FlexibleNumberDecoding.swift) –
    // alle anderen Felder werden ganz regulär dekodiert.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        type = try container.decode(TransactionType.self, forKey: .type)
        amount = try container.decodeFlexibleDouble(forKey: .amount)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        date = try container.decode(String.self, forKey: .date)
        status = try container.decode(TransactionStatus.self, forKey: .status)
        categoryName = try container.decodeIfPresent(String.self, forKey: .categoryName)
        categoryIcon = try container.decodeIfPresent(String.self, forKey: .categoryIcon)
        categoryColor = try container.decodeIfPresent(String.self, forKey: .categoryColor)
    }
}

/// Request-Body für POST /transactions und PUT /transactions/:id.
/// Für PUT werden nur die geänderten Felder gesendet (weshalb hier bereits
/// alles außer `type`, `amount`, `date` optional wäre) – wir bauen für Erstellen
/// und Bearbeiten jeweils einen vollständigen DTO aus dem aktuellen Formularstand.
struct CreateTransactionDto: Codable {
    var type: TransactionType
    var amount: Double
    var description: String?
    var categoryId: String?
    var date: String
    var status: TransactionStatus?
}
