import SwiftUI

/// Eine Zeile "Kategorie – ausgegeben von budgetiert" mit Fortschrittsbalken.
struct CategoryProgressRow: View {
    let summary: CategorySpendSummary

    private var progress: Double {
        summary.budgeted > 0 ? summary.spent / summary.budgeted : 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                CategoryBadge(icon: summary.icon, colorHex: summary.color, size: 28)
                Text(summary.name)
                    .font(.subheadline.weight(.medium))
                Spacer()
                if summary.budgeted > 0 {
                    Text("\(Formatting.currency(summary.spent)) / \(Formatting.currency(summary.budgeted))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text(Formatting.currency(summary.spent))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            if summary.budgeted > 0 {
                ProgressBar(progress: progress, tint: Color(hex: summary.color))
            }
        }
        .padding(.vertical, 4)
    }
}
