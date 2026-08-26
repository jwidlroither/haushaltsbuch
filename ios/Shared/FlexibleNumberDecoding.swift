import Foundation

/// Der Node-Postgres-Treiber (`pg`) liefert `NUMERIC`/`DECIMAL`-Spalten standardmäßig als
/// JSON-STRING statt als Zahl zurück (bekannter node-postgres-Fallstrick, keine eigene
/// `pg.types.setTypeParser`-Registrierung im Backend gefunden) – außer das Backend parst
/// das Feld serverseitig explizit mit `parseFloat` (was es für manche, aber nicht alle
/// Summen-Felder tut). Betroffene Felder wie `Transaction.amount`, `Budget.amount` und
/// `CategoryBudgetStat.total` kommen dadurch mal als Zahl, mal als numerischer String an.
/// Diese Helper akzeptieren robust beides, statt bei jedem Request an einer stillen
/// Backend-Eigenheit zu scheitern.
extension KeyedDecodingContainer {
    func decodeFlexibleDouble(forKey key: Key) throws -> Double {
        if let doubleValue = try? decode(Double.self, forKey: key) {
            return doubleValue
        }
        let stringValue = try decode(String.self, forKey: key)
        guard let parsed = Double(stringValue) else {
            throw DecodingError.dataCorruptedError(
                forKey: key, in: self,
                debugDescription: "Erwartete Zahl oder numerischen String für '\(key.stringValue)', bekam '\(stringValue)'."
            )
        }
        return parsed
    }
}
