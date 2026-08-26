import SwiftUI

struct SettingsView: View {
    @Environment(AppModel.self) private var appModel

    @State private var serverURL: String = SettingsStore.serverURL ?? ""
    @State private var tokenInput: String = ""
    @State private var hasStoredToken = false
    // Startwerte werden in .task mit dem echten Server-Wert (appModel.currentUser?.payday) überschrieben.
    @State private var paydayEnabled = false
    @State private var paydayValue = 27
    @State private var isSavingToken = false
    @State private var isSavingPayday = false
    @State private var statusMessage: String?
    @State private var showDeleteTokenConfirmation = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Server") {
                    TextField("https://haushaltsbuch.example.com/api", text: $serverURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Server-URL speichern") {
                        SettingsStore.serverURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        statusMessage = "Server-URL gespeichert."
                    }
                    .disabled(serverURL.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                Section("API-Token") {
                    if hasStoredToken {
                        Label("Token hinterlegt (••••••••)", systemImage: "checkmark.seal.fill")
                            .foregroundStyle(.green)
                    } else {
                        Label("Kein Token hinterlegt", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                    }

                    SecureField("Neuen Token einfügen", text: $tokenInput)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Button {
                        Task { await saveToken() }
                    } label: {
                        if isSavingToken {
                            ProgressView()
                        } else {
                            Text("Token speichern & prüfen")
                        }
                    }
                    .disabled(tokenInput.trimmingCharacters(in: .whitespaces).isEmpty || isSavingToken)

                    Button("Token löschen", role: .destructive) {
                        showDeleteTokenConfirmation = true
                    }
                    .disabled(!hasStoredToken)
                }

                Section {
                    Toggle("Zahltag verwenden", isOn: $paydayEnabled)
                    if paydayEnabled {
                        Stepper(value: $paydayValue, in: 1...31) {
                            Text("Zahltag: \(paydayValue). des Monats")
                        }
                    }
                    Button {
                        Task { await savePayday() }
                    } label: {
                        if isSavingPayday {
                            ProgressView()
                        } else {
                            Text("Zahltag speichern")
                        }
                    }
                } header: {
                    Text("Zahltag")
                } footer: {
                    Text("Bestimmt, ob dein Tagesbudget bis zum Zahltag oder bis Monatsende reichen muss.")
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Über die App") {
                    LabeledContent("Version", value: appVersion)
                    if let email = appModel.currentUser?.email {
                        LabeledContent("Angemeldet als", value: email)
                    }
                }
            }
            .navigationTitle("Einstellungen")
            .task {
                hasStoredToken = (try? KeychainStore.loadToken())?.isEmpty == false
                if let payday = appModel.currentUser?.payday {
                    paydayEnabled = true
                    paydayValue = payday
                } else {
                    paydayEnabled = false
                }
            }
            .confirmationDialog(
                "Token wirklich löschen?",
                isPresented: $showDeleteTokenConfirmation,
                titleVisibility: .visible
            ) {
                Button("Token löschen", role: .destructive) {
                    try? KeychainStore.deleteToken()
                    hasStoredToken = false
                    appModel.logout()
                }
                Button("Abbrechen", role: .cancel) {}
            } message: {
                Text("Die App zeigt danach wieder den Anmelde-Bildschirm.")
            }
        }
    }

    private var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "–"
        return "\(version) (\(build))"
    }

    private func saveToken() async {
        let trimmed = tokenInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSavingToken = true
        defer { isSavingToken = false }

        let baseURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let user = try await APIClient.shared.verify(baseURL: baseURL, token: trimmed)
            SettingsStore.serverURL = baseURL
            try KeychainStore.saveToken(trimmed)
            hasStoredToken = true
            tokenInput = ""
            statusMessage = "Token gespeichert."
            await appModel.completeOnboarding(user: user)
        } catch let error as APIError {
            statusMessage = error.errorDescription
        } catch {
            statusMessage = "Token konnte nicht gespeichert werden: \(error.localizedDescription)"
        }
    }

    private func savePayday() async {
        isSavingPayday = true
        defer { isSavingPayday = false }
        let value: Int? = paydayEnabled ? paydayValue : nil
        let success = await appModel.updatePayday(value)
        statusMessage = success ? "Zahltag gespeichert." : (appModel.dashboardError?.errorDescription ?? "Speichern fehlgeschlagen.")
    }
}
