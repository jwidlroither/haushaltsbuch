import Foundation

/// Liest/schreibt den `WidgetSnapshot` in den geteilten UserDefaults der App Group.
/// Wird von der App (schreibend, nach jedem Dashboard-Refresh) und vom Widget
/// (lesend, als Fallback zum eigenen Netzwerk-Request) genutzt.
enum AppGroupStore {

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: AppGroup.identifier)
    }

    private static var encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static var decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    static func saveSnapshot(_ snapshot: WidgetSnapshot) {
        guard let defaults else { return }
        do {
            let data = try encoder.encode(snapshot)
            defaults.set(data, forKey: AppGroupKeys.widgetSnapshot)
        } catch {
            // Schreibfehler in den App-Group-Store dürfen die App nie zum Absturz bringen –
            // im schlimmsten Fall zeigt das Widget einfach den alten/keinen Snapshot.
        }
    }

    static func loadSnapshot() -> WidgetSnapshot? {
        guard let defaults, let data = defaults.data(forKey: AppGroupKeys.widgetSnapshot) else {
            return nil
        }
        return try? decoder.decode(WidgetSnapshot.self, from: data)
    }

    /// Server-URL wird zusätzlich in der App Group gespiegelt, damit das Widget
    /// bei Bedarf einen eigenen Direkt-Request an die API absetzen kann.
    static func saveServerURL(_ urlString: String) {
        defaults?.set(urlString, forKey: AppGroupKeys.serverURL)
    }

    static func loadServerURL() -> String? {
        defaults?.string(forKey: AppGroupKeys.serverURL)
    }
}
