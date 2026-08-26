import Foundation

/// Spiegelt exakt die Zahltag-Logik aus `frontend/src/components/dashboard/DailyBudgetWidget.tsx`,
/// damit App und Widget dieselben Zahlen wie die Web-App zeigen.
///
/// Regel: Ist "heute" vor dem Zahltag, muss das verfügbare Geld bis zum Zahltag reichen
/// (Tagesbudget = available / Tage-bis-Zahltag). Ist "heute" am oder nach dem Zahltag
/// (oder gar kein Zahltag hinterlegt), muss das Geld bis zum Monatsende reichen.
enum DailyBudgetCalculator {

    struct Result {
        let dailyAllowed: Double
        let isOver: Bool
        let isWarning: Bool
        let afterPayday: Bool
        let daysUntilPayday: Int
        let daysToCount: Int
        /// Geschätzte Anzahl Tage, für die das verbleibende Geld beim aktuellen Ausgabentempo reicht.
        let daysAtCurrentRate: Double
    }

    static func calculate(
        overview: BudgetOverview,
        today: Int,
        daysInMonth: Int,
        payday: Int?
    ) -> Result {
        let available = overview.available
        // Kein Zahltag hinterlegt → wie "nach dem Zahltag" behandeln (bis Monatsende reicht).
        let effectivePayday = payday ?? (daysInMonth + 1)

        let daysUntilPayday: Int
        let daysToCount: Int
        let afterPayday: Bool

        if today < effectivePayday {
            daysUntilPayday = effectivePayday - today
            daysToCount = daysUntilPayday
            afterPayday = false
        } else {
            daysUntilPayday = daysInMonth - today + (payday ?? daysInMonth)
            daysToCount = daysInMonth - today
            afterPayday = true
        }

        let dailyAllowed = daysToCount > 0 ? available / Double(daysToCount) : available
        let avgPerDay = today > 0 ? (overview.paid + overview.pending) / Double(today) : 0
        let daysAtCurrentRate = avgPerDay > 0 ? available / avgPerDay : 999

        let isOver = available < 0
        let isWarning = !isOver && (dailyAllowed < 5 || (!afterPayday && daysAtCurrentRate < Double(daysUntilPayday)))

        return Result(
            dailyAllowed: dailyAllowed,
            isOver: isOver,
            isWarning: isWarning,
            afterPayday: afterPayday,
            daysUntilPayday: daysUntilPayday,
            daysToCount: daysToCount,
            daysAtCurrentRate: daysAtCurrentRate
        )
    }
}
