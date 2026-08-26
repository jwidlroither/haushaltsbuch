import SwiftUI

/// Tagesbudget-Karte mit Zahltag-Logik – Farbe/Text spiegeln `DailyBudgetWidget.tsx` der Web-App.
struct DailyBudgetCardView: View {
    let overview: BudgetOverview
    let payday: Int?

    private var result: DailyBudgetCalculator.Result {
        let calendar = Calendar.current
        let now = Date()
        let today = calendar.component(.day, from: now)
        let daysInMonth = calendar.range(of: .day, in: .month, for: now)?.count ?? 30
        return DailyBudgetCalculator.calculate(overview: overview, today: today, daysInMonth: daysInMonth, payday: payday)
    }

    private var tint: Color {
        if result.isOver { return .red }
        if result.isWarning { return .orange }
        return .green
    }

    private var label: String {
        if result.isOver { return "Budget überschritten" }
        if !result.afterPayday {
            return "Tagesbudget bis Zahltag (\(payday ?? result.daysToCount).)"
        }
        return "Tagesbudget – heute darfst du noch ausgeben"
    }

    private var subText: String {
        if result.isOver {
            return "\(Formatting.currency(abs(overview.available))) mehr ausgegeben als verfügbar."
        }
        if !result.afterPayday {
            if result.daysAtCurrentRate < Double(result.daysUntilPayday) {
                return "⚠ Bei aktuellem Tempo reicht das Geld nur noch ~\(Int(result.daysAtCurrentRate.rounded())) Tage – aber noch \(result.daysUntilPayday) bis zum Zahltag!"
            }
            return "Noch \(result.daysUntilPayday) Tage bis zum Gehalt · \(Formatting.currency(overview.available)) müssen reichen"
        }
        return "\(result.daysToCount) Tage bis Monatsende · \(Formatting.currency(overview.available)) gesamt verfügbar"
    }

    private var iconName: String {
        if result.isOver { return "exclamationmark.triangle.fill" }
        if result.isWarning { return "exclamationmark.circle.fill" }
        return result.afterPayday ? "checkmark.circle.fill" : "calendar"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(label.uppercased())
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(tint)
                    Text((result.isOver ? "-" : "") + Formatting.currency(abs(result.dailyAllowed)))
                        .font(.system(.largeTitle, design: .monospaced).weight(.bold))
                        .foregroundStyle(tint)
                }
                Spacer()
                Image(systemName: iconName)
                    .font(.title2)
                    .foregroundStyle(tint.opacity(0.7))
            }
            Text(subText)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(tint.opacity(0.4), lineWidth: 1.5)
        )
    }
}
