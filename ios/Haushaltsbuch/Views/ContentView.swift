import SwiftUI

enum AppTab: Int, Hashable {
    case dashboard, new, transactions, settings
}

/// Haupt-TabView. Der "Neu"-Tab zeigt selbst nie Inhalt – ein Tap darauf öffnet
/// sofort das Eingabe-Sheet und springt zur vorher aktiven Tab zurück, statt einen
/// leeren Tab anzuzeigen (siehe Anforderung "Neu" im Aufgabenblatt).
struct ContentView: View {
    @Environment(AppModel.self) private var appModel
    @State private var selectedTab: AppTab = .dashboard

    var body: some View {
        @Bindable var appModel = appModel

        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.pie.fill") }
                .tag(AppTab.dashboard)

            Color.clear
                .tabItem { Label("Neu", systemImage: "plus.circle.fill") }
                .tag(AppTab.new)

            TransactionsView()
                .tabItem { Label("Transaktionen", systemImage: "list.bullet.rectangle") }
                .tag(AppTab.transactions)

            SettingsView()
                .tabItem { Label("Einstellungen", systemImage: "gearshape.fill") }
                .tag(AppTab.settings)
        }
        .onChange(of: selectedTab) { oldTab, newTab in
            guard newTab == .new else { return }
            appModel.isNewTransactionSheetPresented = true
            // Sofort zum vorherigen Tab zurückspringen – der Tab selbst dient nur als Trigger.
            selectedTab = oldTab
        }
        .sheet(isPresented: $appModel.isNewTransactionSheetPresented) {
            NewTransactionSheet()
                .environment(appModel)
        }
    }
}
