import Foundation
import Security

/// Fehler rund um Keychain-Zugriffe. Bewusst kein `!` / `try!` irgendwo –
/// jeder Security-Aufruf liefert einen OSStatus, den wir prüfen.
enum KeychainError: Error {
    case unexpectedStatus(OSStatus)
    case dataConversionFailed
}

/// Speichert den API-Token im iOS Keychain (`kSecClassGenericPassword`).
///
/// Wichtig für das Widget-Sharing: Es wird bewusst KEINE `kSecAttrAccessGroup`
/// explizit gesetzt. Sowohl das App- als auch das Widget-Target listen in ihren
/// jeweiligen `.entitlements`-Dateien unter `keychain-access-groups` genau EINEN
/// Eintrag (die App-Group-ID) – dieser wird vom System automatisch als
/// Standard-Access-Group verwendet, wenn keine andere angegeben wird. So können
/// App und Widget-Extension denselben Keychain-Eintrag lesen, ohne dass der Code
/// die Team-ID zur Laufzeit kennen muss.
enum KeychainStore {

    static func saveToken(_ token: String) throws {
        guard let data = token.data(using: .utf8) else {
            throw KeychainError.dataConversionFailed
        }

        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KeychainConfig.service,
            kSecAttrAccount as String: KeychainConfig.account,
        ]

        // Vorhandenen Eintrag zuerst versuchen zu aktualisieren, sonst neu anlegen.
        let attributesToUpdate: [String: Any] = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributesToUpdate as CFDictionary)

        if updateStatus == errSecItemNotFound {
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            let addStatus = SecItemAdd(query as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(addStatus)
            }
        } else if updateStatus != errSecSuccess {
            throw KeychainError.unexpectedStatus(updateStatus)
        }
    }

    /// Gibt `nil` zurück, wenn kein Token gespeichert ist – nur bei echten Keychain-Fehlern
    /// (z.B. `errSecInteractionNotAllowed`) wird geworfen.
    static func loadToken() throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KeychainConfig.service,
            kSecAttrAccount as String: KeychainConfig.account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
        guard let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
            throw KeychainError.dataConversionFailed
        }
        return token
    }

    static func deleteToken() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: KeychainConfig.service,
            kSecAttrAccount as String: KeychainConfig.account,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
