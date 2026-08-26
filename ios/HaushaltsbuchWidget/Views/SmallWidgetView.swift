import SwiftUI
import WidgetKit

/// ┌─────────────────┐
/// │ 💰 Heute        │
/// │   €12,50        │
/// │   noch frei     │
/// │ Aug · 68% genutzt│
/// └─────────────────┘
struct SmallWidgetView: View {
    let entry: HaushaltsbuchEntry

    private var snapshot: WidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Heute", systemImage: "eurosign.circle.fill")
                .font(.caption.bold())
                .foregroundStyle(.indigo)

            Spacer(minLength: 2)

            Text(Formatting.currency(snapshot.dailyAllowed))
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(snapshot.isOverBudget ? Color.red : Color.primary)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text("noch frei")
                .font(.caption2)
                .foregroundStyle(.secondary)

            Spacer(minLength: 2)

            if entry.isStale {
                WidgetStaleIndicator(generatedAt: snapshot.generatedAt)
            } else {
                Text("\(snapshot.monthLabel) · \(snapshot.usedPercent)% genutzt")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(DeepLink.newTransactionURL)
    }
}

#Preview(as: .systemSmall) {
    HaushaltsbuchWidget()
} timeline: {
    HaushaltsbuchEntry(date: .now, snapshot: .placeholder, isStale: false)
}
