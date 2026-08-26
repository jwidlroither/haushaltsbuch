import Foundation

/// Kompakter Snapshot der Dashboard-Daten, den die App nach jedem erfolgreichen
/// Laden in die App-Group-UserDefaults schreibt. Das Widget liest diesen Snapshot
/// als zuverlässigen Fallback, falls der eigene Netzwerk-Request fehlschlägt.
struct WidgetSnapshot: Codable, Equatable {
    /// Zeitpunkt der Erzeugung – wird im Widget für "Zuletzt aktualisiert vor X Min" verwendet.
    let generatedAt: Date
    /// z.B. "Aug 2026"
    let monthLabel: String
    /// Betrag, der laut Zahltag-Logik heute noch ausgegeben werden darf (kann negativ sein).
    let dailyAllowed: Double
    /// Insgesamt im Monat verfügbarer Betrag (budgetBase - paid - pending).
    let available: Double
    /// Gerundeter Prozentsatz des verbrauchten Budgets (0-100+).
    let usedPercent: Int
    /// Ob das Budget bereits überschritten ist (available < 0).
    let isOverBudget: Bool
    /// Die 2-3 höchsten Kategorie-Ausgaben des Monats, für die Medium-Ansicht.
    let topCategories: [WidgetCategorySpend]
    /// Die letzten 3 Ausgaben (Beschreibung/Kategorie + Betrag), nur für die Large-Ansicht.
    let recentExpenses: [WidgetExpenseEntry]

    static let placeholder = WidgetSnapshot(
        generatedAt: Date(),
        monthLabel: "–",
        dailyAllowed: 0,
        available: 0,
        usedPercent: 0,
        isOverBudget: false,
        topCategories: [],
        recentExpenses: []
    )
}

struct WidgetCategorySpend: Codable, Equatable, Identifiable {
    var id: String { name }
    let name: String
    let icon: String
    let amount: Double
}

/// Einzelne Zeile für "Letzte Ausgaben" im großen Widget.
struct WidgetExpenseEntry: Codable, Equatable {
    let name: String
    let amount: Double
}
