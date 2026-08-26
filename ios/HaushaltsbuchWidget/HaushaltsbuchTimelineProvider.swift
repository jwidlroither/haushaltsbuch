import WidgetKit

struct HaushaltsbuchEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
    /// true, wenn die Daten aus dem App-Group-Cache stammen (eigener Live-Fetch ist fehlgeschlagen)
    /// oder gar keine Daten vorhanden sind – steuert die "Zuletzt aktualisiert"-Anzeige.
    let isStale: Bool
}

struct HaushaltsbuchTimelineProvider: TimelineProvider {

    func placeholder(in context: Context) -> HaushaltsbuchEntry {
        HaushaltsbuchEntry(date: Date(), snapshot: .placeholder, isStale: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (HaushaltsbuchEntry) -> Void) {
        if context.isPreview {
            completion(HaushaltsbuchEntry(date: Date(), snapshot: .placeholder, isStale: false))
            return
        }
        Task {
            completion(await resolveEntry())
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HaushaltsbuchEntry>) -> Void) {
        Task {
            let entry = await resolveEntry()
            // 15-Minuten-Refresh-Policy laut Aufgabenstellung.
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date())
                ?? Date().addingTimeInterval(15 * 60)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    /// Versucht zuerst einen frischen Direkt-Fetch; der App-Group-Cache ist der
    /// zuverlässige Fallback, damit das Widget nie leer bleibt.
    private func resolveEntry() async -> HaushaltsbuchEntry {
        if let live = try? await WidgetDataFetcher.fetchLiveSnapshot() {
            return HaushaltsbuchEntry(date: Date(), snapshot: live, isStale: false)
        }
        if let cached = AppGroupStore.loadSnapshot() {
            return HaushaltsbuchEntry(date: Date(), snapshot: cached, isStale: true)
        }
        return HaushaltsbuchEntry(date: Date(), snapshot: .placeholder, isStale: true)
    }
}
