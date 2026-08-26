import SwiftUI
import WidgetKit

/// ┌─────────────────────────────────┐
/// │ Haushaltsbuch        Aug 2026   │
/// │ Verfügbar: €1.160,00            │
/// │ ████████████████░░░ 68%         │
/// │ Heute: €12,50 pro Tag           │
/// │ Letzte Ausgaben:                │
/// │ Rewe          -€ 45,00          │
/// │ [+ Ausgabe hinzufügen]          │
/// └─────────────────────────────────┘
///
/// Der ganze Widget-Bereich öffnet per Tap (widgetURL) das Neu-Sheet der App – die
/// "+ Ausgabe hinzufügen"-Zeile ist daher bewusst kein eigener interaktiver Button
/// (das würde App Intents / iOS-17-Interactive-Widgets erfordern), sondern eine
/// visuelle Einladung, die denselben Deep-Link wie der Rest der Kachel auslöst.
struct LargeWidgetView: View {
    let entry: HaushaltsbuchEntry

    private var snapshot: WidgetSnapshot { entry.snapshot }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Haushaltsbuch")
                    .font(.headline)
                Spacer()
                Text(snapshot.monthLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Verfügbar: \(Formatting.currency(snapshot.available))")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(snapshot.isOverBudget ? Color.red : Color.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                ProgressBar(progress: Double(snapshot.usedPercent) / 100)
                    .frame(height: 8)
                Text("Heute: \(Formatting.currency(snapshot.dailyAllowed)) pro Tag")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if !snapshot.recentExpenses.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Letzte Ausgaben")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                    ForEach(Array(snapshot.recentExpenses.enumerated()), id: \.offset) { _, expense in
                        HStack {
                            Text(expense.name)
                                .lineLimit(1)
                            Spacer()
                            Text("-\(Formatting.currency(expense.amount))")
                                .foregroundStyle(.red)
                        }
                        .font(.caption)
                    }
                }
            }

            Spacer(minLength: 0)

            HStack {
                Image(systemName: "plus.circle.fill")
                Text("Ausgabe hinzufügen")
                    .font(.caption.bold())
                Spacer()
            }
            .foregroundStyle(.indigo)

            if entry.isStale {
                WidgetStaleIndicator(generatedAt: snapshot.generatedAt)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetURL(DeepLink.newTransactionURL)
    }
}

#Preview(as: .systemLarge) {
    HaushaltsbuchWidget()
} timeline: {
    HaushaltsbuchEntry(date: .now, snapshot: .placeholder, isStale: false)
}
