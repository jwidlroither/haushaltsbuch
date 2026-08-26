import SwiftUI

/// Simpler horizontaler Fortschrittsbalken für Kategorie-Budgets (0-100%, Warnfarbe ab 80%).
struct ProgressBar: View {
    let progress: Double // 0...1 (kann > 1 sein bei Überschreitung, wird visuell geclamped)
    var tint: Color = .indigo

    private var clamped: Double { min(max(progress, 0), 1) }
    private var isOverBudget: Bool { progress > 1 }
    private var isNearLimit: Bool { progress >= 0.8 }

    private var barColor: Color {
        if isOverBudget { return .red }
        if isNearLimit { return .orange }
        return tint
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.gray.opacity(0.2))
                RoundedRectangle(cornerRadius: 4)
                    .fill(barColor)
                    .frame(width: geometry.size.width * clamped)
            }
        }
        .frame(height: 8)
    }
}
