import SwiftUI
import WidgetKit

struct HaushaltsbuchWidget: Widget {
    let kind: String = "HaushaltsbuchWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HaushaltsbuchTimelineProvider()) { entry in
            HaushaltsbuchWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Haushaltsbuch")
        .description("Zeigt dein Tagesbudget und tippt direkt zur Schnelleingabe.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

/// Wählt je nach Widget-Größe die passende Unteransicht.
private struct HaushaltsbuchWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: HaushaltsbuchEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}
