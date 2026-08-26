import Foundation

/// Persistiert einfache, nicht-geheime Einstellungen in UserDefaults.
/// Der API-Token liegt bewusst NICHT hier, sondern in KeychainStore.
enum SettingsStore {
    private static let serverURLKey = "hb_server_url"

    /// z.B. "https://haushaltsbuch.tumpenhasi.at/api"
    static var serverURL: String? {
        get { UserDefaults.standard.string(forKey: serverURLKey) }
        set {
            UserDefaults.standard.set(newValue, forKey: serverURLKey)
            // Zusätzlich in die App Group spiegeln, damit das Widget bei Bedarf
            // einen eigenen Direkt-Request an dieselbe API absetzen kann.
            if let newValue {
                AppGroupStore.saveServerURL(newValue)
            }
        }
    }

    static var hasServerURL: Bool {
        guard let serverURL, !serverURL.isEmpty else { return false }
        return true
    }
}
