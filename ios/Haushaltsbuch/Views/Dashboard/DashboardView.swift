import SwiftUI
import UIKit

struct DashboardView: View {
    @Environment(AppModel.self) private var appModel

    private var isCurrentMonth: Bool {
        let now = Date()
        let calendar = Calendar.current
        return appModel.selectedMonth == calendar.component(.month, from: now)
            && appModel.selectedYear == calendar.component(.year, from: now)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    MonthSelectorBar(
                        month: appModel.selectedMonth,
                        year: appModel.selectedYear,
                        onPrevious: { Task { await appModel.changeMonth(by: -1) } },
                        onNext: { Task { await appModel.changeMonth(by: 1) } }
                    )

                    if let error = appModel.dashboardError {
                        ErrorBanner(message: error.errorDescription ?? "Unbekannter Fehler") {
                            Task { await appModel.loadDashboard() }
                        }
                    }

                    availableBudgetHero

                    if isCurrentMonth {
                        DailyBudgetCardView(overview: appModel.overview, payday: appModel.currentUser?.payday)
                    }

                    if !appModel.overview.categorySpendSummaries().isEmpty {
                        sectionCard(title: "Kategorien") {
                            VStack(spacing: 0) {
                                ForEach(appModel.overview.categorySpendSummaries()) { summary in
                                    CategoryProgressRow(summary: summary)
                                }
                            }
                        }
                    }

                    if !appModel.recentTransactions.isEmpty {
                        sectionCard(title: "Letzte Transaktionen") {
                            VStack(spacing: 0) {
                                ForEach(appModel.recentTransactions) { transaction in
                                    TransactionRow(transaction: transaction)
                                    if transaction.id != appModel.recentTransactions.last?.id {
                                        Divider()
                                    }
                                }
                            }
                        }
                    }

                    if !appModel.overview.pendingTransactions.isEmpty {
                        sectionCard(title: "Ausstehend") {
                            VStack(spacing: 0) {
                                ForEach(appModel.overview.pendingTransactions) { transaction in
                                    TransactionRow(transaction: transaction) {
                                        Task {
                                            let generator = UIImpactFeedbackGenerator(style: .light)
                                            generator.impactOccurred()
                                            await appModel.markPaid(transaction.id)
                                        }
                                    }
                                    if transaction.id != appModel.overview.pendingTransactions.last?.id {
                                        Divider()
                                    }
                                }
                            }
                        }
                    }

                    if appModel.isLoadingDashboard {
                        HStack {
                            Spacer()
                            ProgressView()
                            Spacer()
                        }
                    }
                }
                .padding(16)
            }
            .navigationTitle("Dashboard")
            .refreshable { await appModel.loadDashboard() }
        }
    }

    private var availableBudgetHero: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Verfügbares Budget")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(Formatting.currency(appModel.overview.available))
                .font(.system(size: 40, weight: .bold, design: .monospaced))
                .foregroundStyle(appModel.overview.available < 0 ? Color.red : Color.primary)
            ProgressBar(progress: Double(appModel.overview.usedPercent) / 100)
            Text("\(appModel.overview.usedPercent)% des Budgets verwendet")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private func sectionCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}
