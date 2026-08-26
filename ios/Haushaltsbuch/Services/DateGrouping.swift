import Foundation

struct TransactionSection: Identifiable {
    var id: String { title }
    let title: String
    let transactions: [Transaction]
}

/// Gruppiert Transaktionen nach relativem Datum (Heute/Gestern/Diese Woche/…),
/// jeweils absteigend nach Datum sortiert, wie im Aufgabenblatt für Tab 3 gefordert.
enum DateGrouping {

    private static var utcCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .current
        return calendar
    }()

    static func grouped(_ transactions: [Transaction], referenceDate: Date = Date()) -> [TransactionSection] {
        // "Heute" auf UTC-Mitternacht normalisieren, damit die reinen yyyy-MM-dd-Werte
        // vom Backend unabhängig von der Geräte-Zeitzone korrekt verglichen werden.
        let deviceCalendar = Calendar.current
        var todayComponents = deviceCalendar.dateComponents([.year, .month, .day], from: referenceDate)
        todayComponents.timeZone = TimeZone(identifier: "UTC") ?? .current
        guard let today = utcCalendar.date(from: todayComponents) else {
            return [TransactionSection(title: "Alle", transactions: transactions)]
        }

        var buckets: [String: [Transaction]] = [:]
        var order: [String] = []

        func bucketTitle(for date: Date?) -> String {
            guard let date else { return "Unbekanntes Datum" }
            guard let daysAgo = utcCalendar.dateComponents([.day], from: date, to: today).day else {
                return "Unbekanntes Datum"
            }
            switch daysAgo {
            case 0: return "Heute"
            case 1: return "Gestern"
            case 2...6: return "Diese Woche"
            case 7...13: return "Letzte Woche"
            case _ where daysAgo < 0: return "Geplant"
            default:
                let sameMonth = utcCalendar.isDate(date, equalTo: today, toGranularity: .month)
                return sameMonth ? "Dieser Monat" : "Älter"
            }
        }

        // Sortiert nach Datum absteigend (neueste zuerst), damit "Heute" oben steht.
        let sorted = transactions.sorted { $0.date > $1.date }

        for transaction in sorted {
            let date = Formatting.date(fromISODateString: transaction.date)
            let title = bucketTitle(for: date)
            if buckets[title] == nil {
                buckets[title] = []
                order.append(title)
            }
            buckets[title]?.append(transaction)
        }

        return order.compactMap { title in
            guard let items = buckets[title] else { return nil }
            return TransactionSection(title: title, transactions: items)
        }
    }
}
