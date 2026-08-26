import SwiftUI

/// Monats-Selektor mit Pfeilen links/rechts, wie in Dashboard und Transaktionen gefordert.
struct MonthSelectorBar: View {
    let month: Int
    let year: Int
    let onPrevious: () -> Void
    let onNext: () -> Void

    var body: some View {
        HStack {
            Button(action: onPrevious) {
                Image(systemName: "chevron.left")
            }
            Spacer()
            Text(Formatting.monthYearLabel(month: month, year: year))
                .font(.headline)
            Spacer()
            Button(action: onNext) {
                Image(systemName: "chevron.right")
            }
        }
        .padding(.horizontal, 4)
    }
}
