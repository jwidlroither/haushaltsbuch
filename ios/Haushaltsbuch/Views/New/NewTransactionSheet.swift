import SwiftUI
import UIKit

/// Schnelleingabe-Sheet – öffnet sich sofort beim Tippen auf den "Neu"-Tab.
struct NewTransactionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppModel.self) private var appModel

    @State private var amountText: String = ""
    @State private var type: TransactionType = .expense
    @State private var selectedCategoryId: String?
    @State private var transactionDescription: String = ""
    @State private var date: Date = Date()
    @State private var status: TransactionStatus = .bezahlt
    @State private var isSaving = false
    @State private var errorMessage: String?

    @FocusState private var amountFieldFocused: Bool

    private var filteredCategories: [Category] {
        appModel.categories.filter { $0.matches(type) }
    }

    private var parsedAmount: Double? {
        // Erlaubt sowohl "12,50" (deutsches Format) als auch "12.50".
        let normalized = amountText.replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }

    private var canSave: Bool {
        guard let amount = parsedAmount else { return false }
        return amount > 0
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    amountEntry

                    typeToggle

                    categoryPicker

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Beschreibung")
                            .font(.subheadline.weight(.medium))
                        TextField("z.B. Wocheneinkauf", text: $transactionDescription)
                            .textFieldStyle(.roundedBorder)
                    }

                    DatePicker("Datum", selection: $date, displayedComponents: .date)
                        .datePickerStyle(.compact)

                    statusToggle

                    if let errorMessage {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            if isSaving { ProgressView().tint(.white) }
                            Text("Speichern").bold()
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!canSave || isSaving)
                }
                .padding(20)
            }
            .navigationTitle("Neue Transaktion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
            }
            .onAppear {
                amountFieldFocused = true
            }
            .onChange(of: type) {
                // Kategorien hängen vom Typ ab – bisherige Auswahl könnte nicht mehr passen.
                if let selectedCategoryId, !filteredCategories.contains(where: { $0.id == selectedCategoryId }) {
                    self.selectedCategoryId = nil
                }
            }
        }
        .interactiveDismissDisabled(isSaving)
    }

    private var amountEntry: some View {
        VStack(spacing: 4) {
            HStack {
                Text("€")
                    .font(.system(size: 36, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                TextField("0,00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .focused($amountFieldFocused)
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .fixedSize()
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    private var typeToggle: some View {
        Picker("Typ", selection: $type) {
            Text("🔴 Ausgabe").tag(TransactionType.expense)
            Text("🟢 Einnahme").tag(TransactionType.income)
        }
        .pickerStyle(.segmented)
    }

    private var categoryPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Kategorie")
                .font(.subheadline.weight(.medium))
            if filteredCategories.isEmpty {
                Text("Keine Kategorien verfügbar.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(filteredCategories) { category in
                            categoryChip(category)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }

    private func categoryChip(_ category: Category) -> some View {
        let isSelected = selectedCategoryId == category.id
        return Button {
            selectedCategoryId = isSelected ? nil : category.id
        } label: {
            VStack(spacing: 6) {
                CategoryBadge(icon: category.icon, colorHex: category.color, size: 44)
                    .overlay(
                        Circle().stroke(isSelected ? Color(hex: category.color) : .clear, lineWidth: 2)
                    )
                Text(category.name)
                    .font(.caption2)
                    .lineLimit(1)
                    .frame(width: 60)
            }
        }
        .buttonStyle(.plain)
    }

    private var statusToggle: some View {
        Picker("Status", selection: $status) {
            Text("Bezahlt").tag(TransactionStatus.bezahlt)
            Text("Ausstehend").tag(TransactionStatus.ausstehend)
        }
        .pickerStyle(.segmented)
    }

    private func save() async {
        guard let amount = parsedAmount, amount > 0 else {
            errorMessage = "Bitte einen gültigen Betrag eingeben."
            return
        }
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        let dto = CreateTransactionDto(
            type: type,
            amount: amount,
            description: transactionDescription.isEmpty ? nil : transactionDescription,
            categoryId: selectedCategoryId,
            date: Formatting.isoDateString(from: date),
            status: status
        )

        let success = await appModel.createTransaction(dto)
        if success {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            dismiss()
        } else {
            errorMessage = appModel.dashboardError?.errorDescription ?? "Speichern fehlgeschlagen."
        }
    }
}
