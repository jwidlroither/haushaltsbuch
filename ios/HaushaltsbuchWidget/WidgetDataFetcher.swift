import Foundation

/// Eigenständiger, schlanker Netzwerk-Client NUR für die Widget-Extension.
/// Nutzt bewusst nicht den `APIClient`-Actor aus dem App-Target (der gehört nicht
/// zu den `sources` dieses Targets, siehe project.yml) – für den einen Overview-Request
/// des Widgets reicht ein einfacher, in sich geschlossener URLSession-Aufruf.
/// Token und Server-URL kommen aus dem geteilten Keychain-Access-Group- bzw.
/// App-Group-Speicher (siehe `Shared/KeychainStore.swift`, `Shared/AppGroupStore.swift`).
enum WidgetDataFetcher {

    enum FetchError: Error {
        case missingConfiguration
        case badResponse
    }

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()

    /// Holt frische Dashboard-Daten direkt vom Server und leitet daraus einen `WidgetSnapshot` ab.
    /// Schreibt den frischen Snapshot bei Erfolg gleich wieder in die App Group zurück,
    /// damit auch ein späterer Cache-Fallback möglichst aktuell ist.
    static func fetchLiveSnapshot() async throws -> WidgetSnapshot {
        guard let rawBaseURL = AppGroupStore.loadServerURL(), !rawBaseURL.isEmpty else {
            throw FetchError.missingConfiguration
        }
        guard let token = try? KeychainStore.loadToken(), !token.isEmpty else {
            throw FetchError.missingConfiguration
        }

        var baseURLString = rawBaseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        while baseURLString.hasSuffix("/") {
            baseURLString.removeLast()
        }

        let calendar = Calendar.current
        let now = Date()
        let month = calendar.component(.month, from: now)
        let year = calendar.component(.year, from: now)
        let today = calendar.component(.day, from: now)
        let daysInMonth = calendar.range(of: .day, in: .month, for: now)?.count ?? 30

        async let userEnvelope: UserEnvelope = fetchJSON(
            path: "/auth/me", baseURLString: baseURLString, token: token
        )
        async let overview: BudgetOverview = fetchJSON(
            path: "/budgets/overview",
            queryItems: [
                URLQueryItem(name: "month", value: String(month)),
                URLQueryItem(name: "year", value: String(year)),
            ],
            baseURLString: baseURLString, token: token
        )
        async let recentExpensesEnvelope: APIEnvelope<[Transaction]> = fetchJSON(
            path: "/transactions",
            queryItems: [
                URLQueryItem(name: "month", value: String(month)),
                URLQueryItem(name: "year", value: String(year)),
                URLQueryItem(name: "type", value: "expense"),
                URLQueryItem(name: "limit", value: "3"),
                URLQueryItem(name: "offset", value: "0"),
            ],
            baseURLString: baseURLString, token: token
        )

        let (resolvedUser, resolvedOverview, resolvedRecent) = try await (userEnvelope, overview, recentExpensesEnvelope)

        let dailyAllowed = DailyBudgetCalculator.calculate(
            overview: resolvedOverview, today: today, daysInMonth: daysInMonth, payday: resolvedUser.user.payday
        ).dailyAllowed

        let topCategories = resolvedOverview.categorySpendSummaries()
            .prefix(3)
            .map { WidgetCategorySpend(name: $0.name, icon: $0.icon, amount: $0.spent) }

        let recentExpenses = resolvedRecent.data.prefix(3).map { transaction -> WidgetExpenseEntry in
            let description = transaction.description ?? ""
            let name = description.isEmpty ? (transaction.categoryName ?? "Ausgabe") : description
            return WidgetExpenseEntry(name: name, amount: transaction.amount)
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "MMM yyyy"

        let snapshot = WidgetSnapshot(
            generatedAt: Date(),
            monthLabel: formatter.string(from: now),
            dailyAllowed: dailyAllowed,
            available: resolvedOverview.available,
            usedPercent: resolvedOverview.usedPercent,
            isOverBudget: resolvedOverview.available < 0,
            topCategories: Array(topCategories),
            recentExpenses: Array(recentExpenses)
        )

        AppGroupStore.saveSnapshot(snapshot)
        return snapshot
    }

    private static func fetchJSON<T: Decodable>(
        path: String,
        queryItems: [URLQueryItem] = [],
        baseURLString: String,
        token: String
    ) async throws -> T {
        guard var components = URLComponents(string: baseURLString) else {
            throw FetchError.missingConfiguration
        }
        components.path += path
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw FetchError.missingConfiguration
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // Widget-Refreshes müssen zügig scheitern können, damit rechtzeitig auf den Cache
        // zurückgefallen wird, statt das System-Zeitbudget für den Refresh zu verbrauchen.
        request.timeoutInterval = 8

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw FetchError.badResponse
        }

        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw FetchError.badResponse
        }

        return try decoder.decode(T.self, from: data)
    }
}
