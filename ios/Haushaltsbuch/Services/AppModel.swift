import Foundation
import Observation

/// Zentraler, geteilter Zustand der App – wird einmal in `HaushaltsbuchApp` erzeugt
/// und per `.environment()` an alle Tabs weitergereicht. Damit refresht z.B. das
/// Speichern einer neuen Transaktion im "Neu"-Sheet automatisch das Dashboard.
@MainActor
@Observable
final class AppModel {
    private let api = APIClient.shared

    // Auth / Onboarding
    var isAuthenticated = false
    var currentUser: User?
    var isBootstrapping = true

    // Ausgewählter Monat für Dashboard & Transaktionen
    var selectedMonth: Int
    var selectedYear: Int

    // Daten
    var overview: BudgetOverview = .empty
    var categories: [Category] = []
    var recentTransactions: [Transaction] = []

    // Vollständige Liste für Tab 3 (Transaktionen), inkl. optionaler Filter
    var transactionsList: [Transaction] = []
    var transactionsTotal: Int = 0
    var filterCategoryId: String?
    var filterType: TransactionType?
    var filterStatus: TransactionStatus?

    // UI-Status
    var isLoadingDashboard = false
    var isLoadingTransactions = false
    var dashboardError: APIError?
    var transactionsError: APIError?

    // Steuerung des "Neu"-Sheets – wird sowohl vom Tab-Tap als auch vom Widget-Deep-Link gesetzt
    var isNewTransactionSheetPresented = false

    init() {
        let now = Date()
        let calendar = Calendar.current
        self.selectedMonth = calendar.component(.month, from: now)
        self.selectedYear = calendar.component(.year, from: now)
    }

    /// Wird beim App-Start aufgerufen: prüft ob Server-URL + Token vorhanden und gültig sind.
    func bootstrap() async {
        isBootstrapping = true
        defer { isBootstrapping = false }

        guard SettingsStore.hasServerURL else {
            isAuthenticated = false
            return
        }
        guard let token = try? KeychainStore.loadToken(), !token.isEmpty else {
            isAuthenticated = false
            return
        }

        do {
            let user = try await api.fetchMe()
            currentUser = user
            isAuthenticated = true
            await loadCategories()
            await refreshAll()
        } catch {
            // Ungültiger/abgelaufener Token → zurück zum Onboarding.
            isAuthenticated = false
        }
    }

    /// Wird vom Onboarding-Screen nach erfolgreicher Token-Prüfung aufgerufen.
    func completeOnboarding(user: User) async {
        currentUser = user
        isAuthenticated = true
        await loadCategories()
        await refreshAll()
    }

    func logout() {
        try? KeychainStore.deleteToken()
        currentUser = nil
        isAuthenticated = false
        overview = .empty
        recentTransactions = []
        transactionsList = []
        categories = []
    }

    // MARK: - Laden

    func loadDashboard() async {
        isLoadingDashboard = true
        dashboardError = nil
        defer { isLoadingDashboard = false }

        do {
            async let overviewTask = api.fetchBudgetOverview(month: selectedMonth, year: selectedYear)
            async let recentTask = api.fetchTransactions(
                month: selectedMonth, year: selectedYear, limit: 5, offset: 0
            )
            let (fetchedOverview, fetchedRecent) = try await (overviewTask, recentTask)
            overview = fetchedOverview
            recentTransactions = fetchedRecent.items
            syncWidgetSnapshot()
        } catch let error as APIError {
            dashboardError = error
            handlePotentialAuthFailure(error)
        } catch {
            dashboardError = .network(error.localizedDescription)
        }
    }

    func loadCategories() async {
        do {
            categories = try await api.fetchCategories()
        } catch let error as APIError {
            handlePotentialAuthFailure(error)
        } catch {
            // Kategorien sind für die Grundfunktion nicht kritisch genug für einen Alert –
            // Picker zeigt dann einfach eine leere Liste.
        }
    }

    /// Lädt die vollständige, gefilterte Liste für den Transaktionen-Tab.
    func loadTransactionsList() async {
        isLoadingTransactions = true
        transactionsError = nil
        defer { isLoadingTransactions = false }

        do {
            let result = try await api.fetchTransactions(
                month: selectedMonth, year: selectedYear,
                categoryId: filterCategoryId, type: filterType, status: filterStatus
            )
            transactionsList = result.items
            transactionsTotal = result.total
        } catch let error as APIError {
            transactionsError = error
            handlePotentialAuthFailure(error)
        } catch {
            transactionsError = .network(error.localizedDescription)
        }
    }

    func changeMonth(by delta: Int) async {
        var month = selectedMonth + delta
        var year = selectedYear
        if month < 1 { month = 12; year -= 1 }
        if month > 12 { month = 1; year += 1 }
        selectedMonth = month
        selectedYear = year
        await refreshAll()
    }

    /// Lädt Dashboard-Übersicht und die Transaktionsliste gemeinsam neu, z.B. nach
    /// Monatswechsel oder nach einer Änderung (Anlegen/Löschen/Bezahlt markieren).
    func refreshAll() async {
        async let dashboard: Void = loadDashboard()
        async let list: Void = loadTransactionsList()
        _ = await (dashboard, list)
    }

    // MARK: - Mutationen

    @discardableResult
    func createTransaction(_ dto: CreateTransactionDto) async -> Bool {
        do {
            _ = try await api.createTransaction(dto)
            await refreshAll()
            return true
        } catch let error as APIError {
            dashboardError = error
            handlePotentialAuthFailure(error)
            return false
        } catch {
            dashboardError = .network(error.localizedDescription)
            return false
        }
    }

    @discardableResult
    func markPaid(_ id: String) async -> Bool {
        do {
            _ = try await api.markPaid(id: id)
            await refreshAll()
            return true
        } catch let error as APIError {
            dashboardError = error
            handlePotentialAuthFailure(error)
            return false
        } catch {
            dashboardError = .network(error.localizedDescription)
            return false
        }
    }

    @discardableResult
    func deleteTransaction(_ id: String) async -> Bool {
        do {
            try await api.deleteTransaction(id: id)
            await refreshAll()
            return true
        } catch let error as APIError {
            dashboardError = error
            handlePotentialAuthFailure(error)
            return false
        } catch {
            dashboardError = .network(error.localizedDescription)
            return false
        }
    }

    @discardableResult
    func updatePayday(_ payday: Int?) async -> Bool {
        do {
            let user = try await api.updateMe(payday: payday)
            currentUser = user
            await refreshAll()
            return true
        } catch let error as APIError {
            dashboardError = error
            handlePotentialAuthFailure(error)
            return false
        } catch {
            dashboardError = .network(error.localizedDescription)
            return false
        }
    }

    private func handlePotentialAuthFailure(_ error: APIError) {
        if error == .unauthorized {
            isAuthenticated = false
            currentUser = nil
        }
    }

    // MARK: - Widget

    /// Schreibt einen kompakten Snapshot der aktuellen Dashboard-Daten in die App Group,
    /// damit das Widget auch ohne eigenen erfolgreichen Netzwerk-Request etwas anzeigen kann.
    /// Nur relevant, wenn der aktuell angezeigte Monat auch der reale aktuelle Monat ist –
    /// beim Blättern in vergangene/zukünftige Monate bleibt der letzte gültige Snapshot erhalten.
    private func syncWidgetSnapshot() {
        let calendar = Calendar.current
        let now = Date()
        let today = calendar.component(.day, from: now)
        let currentRealMonth = calendar.component(.month, from: now)
        let currentRealYear = calendar.component(.year, from: now)
        guard selectedMonth == currentRealMonth, selectedYear == currentRealYear else { return }

        let daysInMonth = calendar.range(of: .day, in: .month, for: now)?.count ?? 30
        let payday = currentUser?.payday

        let dailyAllowed = DailyBudgetCalculator.calculate(
            overview: overview, today: today, daysInMonth: daysInMonth, payday: payday
        ).dailyAllowed

        let topCategories = overview.categorySpendSummaries()
            .prefix(3)
            .map { WidgetCategorySpend(name: $0.name, icon: $0.icon, amount: $0.spent) }

        let recentExpenses = recentTransactions
            .filter { $0.type == .expense }
            .prefix(3)
            .map { transaction -> WidgetExpenseEntry in
                let description = transaction.description ?? ""
                let name = description.isEmpty ? (transaction.categoryName ?? "Ausgabe") : description
                return WidgetExpenseEntry(name: name, amount: transaction.amount)
            }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "MMM yyyy"
        var monthDateComponents = DateComponents()
        monthDateComponents.month = selectedMonth
        monthDateComponents.year = selectedYear
        monthDateComponents.day = 1
        let monthLabel = calendar.date(from: monthDateComponents).map { formatter.string(from: $0) } ?? "\(selectedMonth)/\(selectedYear)"

        let snapshot = WidgetSnapshot(
            generatedAt: Date(),
            monthLabel: monthLabel,
            dailyAllowed: dailyAllowed,
            available: overview.available,
            usedPercent: overview.usedPercent,
            isOverBudget: overview.available < 0,
            topCategories: Array(topCategories),
            recentExpenses: Array(recentExpenses)
        )
        AppGroupStore.saveSnapshot(snapshot)
    }
}
