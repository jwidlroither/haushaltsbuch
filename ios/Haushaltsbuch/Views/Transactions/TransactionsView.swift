import SwiftUI

struct TransactionsView: View {
    @Environment(AppModel.self) private var appModel

    @State private var transactionPendingDeletion: Transaction?
    @State private var showDeleteConfirmation = false

    private var sections: [TransactionSection] {
        DateGrouping.grouped(appModel.transactionsList)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    MonthSelectorBar(
                        month: appModel.selectedMonth,
                        year: appModel.selectedYear,
                        onPrevious: { Task { await appModel.changeMonth(by: -1) } },
                        onNext: { Task { await appModel.changeMonth(by: 1) } }
                    )
                    .listRowSeparator(.hidden)
                }

                if let error = appModel.transactionsError {
                    Section {
                        ErrorBanner(message: error.errorDescription ?? "Unbekannter Fehler") {
                            Task { await appModel.loadTransactionsList() }
                        }
                        .listRowSeparator(.hidden)
                    }
                }

                if appModel.transactionsList.isEmpty && !appModel.isLoadingTransactions {
                    Section {
                        Text("Keine Transaktionen in diesem Monat.")
                            .foregroundStyle(.secondary)
                            .font(.subheadline)
                    }
                }

                ForEach(sections) { section in
                    Section(section.title) {
                        ForEach(section.transactions) { transaction in
                            TransactionRow(transaction: transaction)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        transactionPendingDeletion = transaction
                                        showDeleteConfirmation = true
                                    } label: {
                                        Label("Löschen", systemImage: "trash")
                                    }
                                }
                                .swipeActions(edge: .leading, allowsFullSwipe: transaction.status == .ausstehend) {
                                    if transaction.status == .ausstehend {
                                        Button {
                                            Task { await appModel.markPaid(transaction.id) }
                                        } label: {
                                            Label("Bezahlt", systemImage: "checkmark.circle.fill")
                                        }
                                        .tint(.green)
                                    }
                                }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Transaktionen")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterMenu
                }
            }
            .refreshable { await appModel.loadTransactionsList() }
            .task { await appModel.loadTransactionsList() }
            .confirmationDialog(
                "Transaktion löschen?",
                isPresented: $showDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Löschen", role: .destructive) {
                    if let transaction = transactionPendingDeletion {
                        Task { await appModel.deleteTransaction(transaction.id) }
                    }
                    transactionPendingDeletion = nil
                }
                Button("Abbrechen", role: .cancel) {
                    transactionPendingDeletion = nil
                }
            } message: {
                if let transaction = transactionPendingDeletion {
                    Text(transaction.description ?? transaction.categoryName ?? "Diese Transaktion")
                }
            }
        }
    }

    private var filterMenu: some View {
        @Bindable var appModel = appModel
        return Menu {
            Picker("Typ", selection: $appModel.filterType.animation()) {
                Text("Alle Typen").tag(TransactionType?.none)
                Text("Ausgabe").tag(TransactionType?.some(.expense))
                Text("Einnahme").tag(TransactionType?.some(.income))
            }
            Picker("Status", selection: $appModel.filterStatus.animation()) {
                Text("Alle Status").tag(TransactionStatus?.none)
                Text("Bezahlt").tag(TransactionStatus?.some(.bezahlt))
                Text("Ausstehend").tag(TransactionStatus?.some(.ausstehend))
            }
            Picker("Kategorie", selection: $appModel.filterCategoryId.animation()) {
                Text("Alle Kategorien").tag(String?.none)
                ForEach(appModel.categories) { category in
                    Text("\(category.icon) \(category.name)").tag(String?.some(category.id))
                }
            }
        } label: {
            Image(systemName: hasActiveFilter ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
        }
        .onChange(of: appModel.filterType) { _, _ in Task { await appModel.loadTransactionsList() } }
        .onChange(of: appModel.filterStatus) { _, _ in Task { await appModel.loadTransactionsList() } }
        .onChange(of: appModel.filterCategoryId) { _, _ in Task { await appModel.loadTransactionsList() } }
    }

    private var hasActiveFilter: Bool {
        appModel.filterType != nil || appModel.filterStatus != nil || appModel.filterCategoryId != nil
    }
}
