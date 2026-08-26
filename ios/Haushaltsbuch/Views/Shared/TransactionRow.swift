import SwiftUI

/// Wiederverwendbare Zeile für Dashboard ("letzte 5") und Transaktionen-Liste.
struct TransactionRow: View {
    let transaction: Transaction
    /// Wird gesetzt, wenn im Kontext eine "Als bezahlt"-Aktion angeboten werden soll
    /// (z.B. in der ausstehend-Sektion des Dashboards).
    var onMarkPaid: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            CategoryBadge(
                icon: transaction.categoryIcon ?? "❓",
                colorHex: transaction.categoryColor ?? "#9CA3AF"
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(transaction.categoryName ?? "Ohne Kategorie")
                    Text("·")
                    Text(Formatting.shortDayMonth(fromISODateString: transaction.date))
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(amountText)
                    .font(.system(.subheadline, design: .monospaced).weight(.bold))
                    .foregroundStyle(transaction.type == .income ? Color.green : Color.red)

                if transaction.status == .ausstehend {
                    if let onMarkPaid {
                        Button("Als bezahlt", action: onMarkPaid)
                            .font(.caption2.bold())
                            .buttonStyle(.borderless)
                    } else {
                        Text("Ausstehend")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var title: String {
        if let description = transaction.description, !description.isEmpty {
            return description
        }
        return transaction.categoryName ?? "Ohne Kategorie"
    }

    private var amountText: String {
        let sign = transaction.type == .income ? "+" : "-"
        return "\(sign)\(Formatting.currency(transaction.amount))"
    }
}
