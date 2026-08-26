import Foundation

struct User: Codable, Equatable {
    let userId: String
    let email: String
    let name: String
    /// Tag des Monats (1-31), an dem Gehalt eingeht. `nil`, wenn nicht gesetzt.
    let payday: Int?
}

/// Wrapper für GET/PATCH /auth/me, das Backend liefert `{ "user": { ... } }`.
struct UserEnvelope: Codable {
    let user: User
}
