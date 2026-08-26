import Foundation

/// Eine gespeicherte Budget-Vorgabe. `categoryId == nil` bedeutet Gesamtbudget des Monats.
struct Budget: Decodable, Identifiable, Equatable {
    let id: String
    let userId: String
    let categoryId: String?
    let month: Int
    let year: Int
    let amount: Double
    let categoryName: String?
    let categoryIcon: String?
    let categoryColor: String?

    private enum CodingKeys: String, CodingKey {
        case id, userId, categoryId, month, year, amount
        case categoryName, categoryIcon, categoryColor
    }

    // Manuelles Decoding nur wegen `amount` (rohe DECIMAL-Spalte, siehe FlexibleNumberDecoding.swift).
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        userId = try container.decode(String.self, forKey: .userId)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        month = try container.decode(Int.self, forKey: .month)
        year = try container.decode(Int.self, forKey: .year)
        amount = try container.decodeFlexibleDouble(forKey: .amount)
        categoryName = try container.decodeIfPresent(String.self, forKey: .categoryName)
        categoryIcon = try container.decodeIfPresent(String.self, forKey: .categoryIcon)
        categoryColor = try container.decodeIfPresent(String.self, forKey: .categoryColor)
    }
}

/// Eine Zeile aus `byCategory` in /budgets/overview: Summe der Ausgaben einer Kategorie
/// für einen bestimmten Status (bezahlt/ausstehend) im gewählten Monat. Kommt vom Backend
/// gruppiert nach (category_id, status) – für eine Kategorie können also bis zu zwei
/// Einträge existieren (einer je Status). `categoryId`/`categoryName` sind optional, weil
/// nicht kategorisierte Transaktionen mit `category_id = NULL` gruppiert werden.
struct CategoryBudgetStat: Decodable, Equatable {
    let categoryId: String?
    let categoryName: String?
    let categoryIcon: String?
    let categoryColor: String?
    let status: TransactionStatus
    let total: Double

    private enum CodingKeys: String, CodingKey {
        case categoryId, categoryName, categoryIcon, categoryColor, status, total
    }

    // Manuelles Decoding nur wegen `total` (rohes SUM() über eine DECIMAL-Spalte,
    // siehe FlexibleNumberDecoding.swift).
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        categoryId = try container.decodeIfPresent(String.self, forKey: .categoryId)
        categoryName = try container.decodeIfPresent(String.self, forKey: .categoryName)
        categoryIcon = try container.decodeIfPresent(String.self, forKey: .categoryIcon)
        categoryColor = try container.decodeIfPresent(String.self, forKey: .categoryColor)
        status = try container.decode(TransactionStatus.self, forKey: .status)
        total = try container.decodeFlexibleDouble(forKey: .total)
    }
}

struct BudgetOverview: Decodable, Equatable {
    let month: Int
    let year: Int
    /// Explizit gesetztes Gesamtbudget des Monats (0, wenn keins hinterlegt ist).
    let totalBudget: Double
    let totalIncome: Double
    /// Summe bereits bezahlter Ausgaben.
    let paid: Double
    /// Summe noch ausstehender Ausgaben.
    let pending: Double
    /// budgetBase - paid - pending. Kann negativ sein (Budget überschritten).
    let available: Double
    /// totalBudget, falls gesetzt, sonst totalIncome als Fallback-Basis.
    let budgetBase: Double
    let usedPercent: Int
    let paidPercent: Int
    let pendingPercent: Int
    let categoryBudgets: [Budget]
    let byCategory: [CategoryBudgetStat]
    let pendingTransactions: [Transaction]

    static let empty = BudgetOverview(
        month: Calendar.current.component(.month, from: Date()),
        year: Calendar.current.component(.year, from: Date()),
        totalBudget: 0, totalIncome: 0, paid: 0, pending: 0, available: 0, budgetBase: 0,
        usedPercent: 0, paidPercent: 0, pendingPercent: 0,
        categoryBudgets: [], byCategory: [], pendingTransactions: []
    )

    /// Fasst `byCategory` je Kategorie zusammen (bezahlt + ausstehend) und rechnet
    /// das jeweils hinterlegte Budget dagegen – für die Fortschrittsbalken im Dashboard.
    func categorySpendSummaries() -> [CategorySpendSummary] {
        var totalsByCategory: [String: (name: String, icon: String, color: String, spent: Double)] = [:]

        for stat in byCategory {
            guard let categoryId = stat.categoryId else { continue } // "ohne Kategorie" wird hier ausgeblendet
            let name = stat.categoryName ?? "Unbekannt"
            let icon = stat.categoryIcon ?? "❓"
            let color = stat.categoryColor ?? "#9CA3AF"
            var entry = totalsByCategory[categoryId] ?? (name, icon, color, 0)
            entry.spent += stat.total
            totalsByCategory[categoryId] = entry
        }

        // `uniquingKeysWith` statt `uniqueKeysWithValues`, damit ein unerwarteter doppelter
        // Budget-Eintrag für dieselbe Kategorie (sollte laut Backend-Constraint nicht vorkommen)
        // die App nie zum Absturz bringt.
        let budgetByCategory = Dictionary(
            categoryBudgets.compactMap { budget -> (String, Double)? in
                guard let categoryId = budget.categoryId else { return nil }
                return (categoryId, budget.amount)
            },
            uniquingKeysWith: { _, latest in latest }
        )

        return totalsByCategory.map { categoryId, entry in
            let budgeted = budgetByCategory[categoryId] ?? 0
            let usedPercent = budgeted > 0 ? min(999, Int((entry.spent / budgeted) * 100)) : 0
            return CategorySpendSummary(
                categoryId: categoryId,
                name: entry.name,
                icon: entry.icon,
                color: entry.color,
                budgeted: budgeted,
                spent: entry.spent,
                usedPercent: usedPercent
            )
        }
        .sorted { $0.spent > $1.spent }
    }
}

/// Aufbereitete Kategorie-Zeile für die UI (Dashboard-Fortschrittsbalken, Widget-Snapshot).
struct CategorySpendSummary: Identifiable {
    var id: String { categoryId }
    let categoryId: String
    let name: String
    let icon: String
    let color: String
    let budgeted: Double
    let spent: Double
    let usedPercent: Int
}
