import SwiftUI
import WidgetKit

/// ┌─────────────────────────────────┐
/// │ Tagesbudget          Aug 2026   │
/// │   €12,50 noch heute             │
/// │   ████████████░░░░ 68%          │
/// │ 🛒 €45  ⛽ €30  🎬 €12         │
/// └─────────────────────────────────┘
struct MediumWidgetView: View {
    let entry: HaushaltsbuchEntry

    private var snapshot: WidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Tagesbudget")
                    .font(.subheadline.bold())
                Spacer()
                Text(snapshot.monthLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("\(Formatting.currency(snapshot.dailyAllowed)) noch heute")
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(snapshot.isOverBudget ? Color.red : Color.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            HStack(spacing: 8) {
                ProgressBar(progress: Double(snapshot.usedPercent) / 100)
                    .frame(height: 8)
                Text("\(snapshot.usedPercent)%")
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)
            }

            if !snapshot.topCategories.isEmpty {
                HStack(spacing: 14) {
                    ForEach(Array(snapshot.topCategories.enumerated()), id: \.offset) { _, category in
                        HStack(spacing: 4) {
                            Text(category.icon)
                            Text(Formatting.currency(category.amount))
                                .font(.caption2.bold())
                        }
                    }
                    Spacer()
                }
            }

            if entry.isStale {
                WidgetStaleIndicator(generatedAt: snapshot.generatedAt)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(DeepLink.newTransactionURL)
    }
}

#Preview(as: .systemMedium) {
    HaushaltsbuchWidget()
} timeline: {
    HaushaltsbuchEntry(date: .now, snapshot: .placeholder, isStale: false)
}
