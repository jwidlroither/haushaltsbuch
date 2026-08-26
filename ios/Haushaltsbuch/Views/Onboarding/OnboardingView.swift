import SwiftUI

/// Erststart-Bildschirm: Server-URL + persönlicher API-Token (aus der Web-App
/// unter Einstellungen erzeugt) werden hier eingegeben und gegen /auth/me geprüft,
/// bevor sie in UserDefaults bzw. Keychain gespeichert werden.
struct OnboardingView: View {
    @Environment(AppModel.self) private var appModel

    @State private var serverURL: String = SettingsStore.serverURL ?? "https://"
    @State private var token: String = ""
    @State private var isVerifying = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Server-URL")
                            .font(.subheadline).bold()
                        TextField("https://haushaltsbuch.example.com/api", text: $serverURL)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("API-Token")
                            .font(.subheadline).bold()
                        Text("In der Web-App unter Einstellungen → API-Tokens erzeugen und hier einfügen.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        SecureField("Token einfügen", text: $token)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    if let errorMessage {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await verifyAndSave() }
                    } label: {
                        HStack {
                            if isVerifying {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text("Verbinden")
                                .bold()
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!canSubmit || isVerifying)
                }
                .padding(24)
            }
            .navigationTitle("Willkommen")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "eurosign.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.indigo)
            Text("Haushaltsbuch")
                .font(.largeTitle).bold()
            Text("Verbinde die App mit deinem selbst gehosteten Server.")
                .foregroundStyle(.secondary)
        }
    }

    private var canSubmit: Bool {
        !serverURL.trimmingCharacters(in: .whitespaces).isEmpty
            && !token.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func verifyAndSave() async {
        errorMessage = nil
        isVerifying = true
        defer { isVerifying = false }

        let trimmedURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedToken = token.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            let user = try await APIClient.shared.verify(baseURL: trimmedURL, token: trimmedToken)
            // Erst nach erfolgreicher Prüfung persistieren.
            SettingsStore.serverURL = trimmedURL
            do {
                try KeychainStore.saveToken(trimmedToken)
            } catch {
                errorMessage = "Token konnte nicht im Schlüsselbund gespeichert werden."
                return
            }
            await appModel.completeOnboarding(user: user)
        } catch let error as APIError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = "Unerwarteter Fehler: \(error.localizedDescription)"
        }
    }
}
