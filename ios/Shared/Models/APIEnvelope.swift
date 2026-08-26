import Foundation

/// Generische Hülle für Endpunkte, die `{ "data": T }` bzw. `{ "data": T, "total": Int }` liefern.
struct APIEnvelope<T: Decodable>: Decodable {
    let data: T
    let total: Int?
}

/// Typisierter Fehler für alle Netzwerk-/API-Aufrufe. Wird in der UI direkt als
/// Alert-/Inline-Text angezeigt statt die App abstürzen zu lassen.
enum APIError: Error, LocalizedError, Equatable {
    case invalidBaseURL
    case notAuthenticated
    case unauthorized
    case server(status: Int, message: String?)
    case decoding
    case network(String)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Die Server-URL ist ungültig. Bitte in den Einstellungen prüfen."
        case .notAuthenticated:
            return "Kein API-Token hinterlegt. Bitte in den Einstellungen einfügen."
        case .unauthorized:
            return "Anmeldung abgelaufen. Bitte Token erneut eingeben."
        case .server(let status, let message):
            return message ?? "Server-Fehler (\(status))."
        case .decoding:
            return "Antwort des Servers konnte nicht gelesen werden."
        case .network(let message):
            return "Netzwerkfehler: \(message)"
        }
    }
}
