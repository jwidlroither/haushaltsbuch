import Foundation

/// Zentrale Konstanten, die sowohl von der App als auch von der Widget-Extension
/// verwendet werden. Liegen in `ios/Shared/`, weil dieser Ordner als zusätzlicher
/// `sources`-Pfad in beiden XcodeGen-Targets eingebunden ist (siehe project.yml) –
/// so muss der Code nicht dupliziert werden.
enum AppGroup {
    /// Muss exakt mit der App-Group-ID übereinstimmen, die in beiden .entitlements-Dateien
    /// und im Apple Developer Account registriert ist.
    static let identifier = "group.at.tumpenhasi.haushaltsbuch"
}

enum DeepLink {
    static let scheme = "haushaltsbuch"
    /// haushaltsbuch://new öffnet direkt das Neu-Sheet
    static let newTransactionHost = "new"

    static var newTransactionURL: URL? {
        URL(string: "\(scheme)://\(newTransactionHost)")
    }
}

/// Schlüssel für Keychain-Einträge. Es wird bewusst KEINE explizite
/// `kSecAttrAccessGroup` beim Lesen/Schreiben gesetzt (siehe KeychainStore) –
/// stattdessen enthalten beide .entitlements-Dateien genau EINEN Eintrag unter
/// `keychain-access-groups` (die App-Group-ID). Damit ist dieser Eintrag für
/// App und Widget automatisch die Standard-Access-Group, ohne dass der Code
/// die Team-ID zur Laufzeit kennen muss.
enum KeychainConfig {
    static let service = "at.tumpenhasi.haushaltsbuch.apitoken"
    static let account = "api-token"
}

/// Schlüssel innerhalb des geteilten UserDefaults-Suite (App Group).
enum AppGroupKeys {
    static let widgetSnapshot = "hb_widget_snapshot"
    static let serverURL = "hb_server_url"
}
