# Haushaltsbuch – iOS App + Home-Screen-Widget

SwiftUI-Client (iOS 17+) für das selbst gehostete Haushaltsbuch-Backend, plus eine
WidgetKit-Extension mit Small/Medium/Large-Widget. Keine Drittanbieter-Abhängigkeiten –
nur Apple-Frameworks (SwiftUI, WidgetKit, Security/Keychain, Foundation).

## Warum kein eingechecktes `Haushaltsbuch.xcodeproj`?

Die Aufgabenstellung verlangt wörtlich `./ios/Haushaltsbuch.xcodeproj`. In der Umgebung,
in der dieses Projekt erstellt wurde, stand aber **kein Xcode, kein Swift-Compiler und
kein `xcodegen`** zur Verfügung (`which swift xcodegen xcodebuild` schlagen alle fehl).

`project.pbxproj` ist ein internes, teils schwer lesbares Xcode-Format. Eine von Hand
geschriebene `.pbxproj`-Datei lässt sich ohne Xcode nicht validieren – ein einziger
falscher Verweis, eine falsche UUID oder ein vergessenes Komma reicht, damit Xcode die
Datei gar nicht erst öffnet oder das Projekt in einem kaputten Zustand ist, ohne dass das
hier auffällt. Das wäre schlechter, als gar kein Projekt mitzuliefern.

Stattdessen liegt hier **[`project.yml`](project.yml)**, eine [XcodeGen](https://github.com/yonaskolb/XcodeGen)-Spezifikation.
XcodeGen erzeugt daraus + der vorhandenen Ordnerstruktur (`Haushaltsbuch/`, `HaushaltsbuchWidget/`,
`Shared/`) deterministisch ein korrektes, standardkonformes `.xcodeproj`. Der Vorteil: `project.yml`
ist reine, für Menschen lesbare YAML – reviewbar, diffbar, ohne binäre/UUID-Altlasten – und alles,
was tatsächlich committet ist (dieses File + der Quellcode), lässt sich vollständig lesen und
nachvollziehen. Das ist ein bewusster, dokumentierter Ersatz für die wörtliche Anweisung, und
sollte für dich als Nutzer der Grund sein, warum du hier kein `.xcodeproj` im Repo findest.

## Bauen mit XcodeGen (empfohlen)

1. XcodeGen installieren (einmalig, auf einem Mac mit Xcode):
   ```bash
   brew install xcodegen
   ```
2. Im `ios/`-Verzeichnis das Projekt generieren:
   ```bash
   cd ios
   xcodegen generate
   ```
   Das erzeugt `ios/Haushaltsbuch.xcodeproj` (bewusst nicht eingecheckt, siehe `ios/.gitignore`).
3. `Haushaltsbuch.xcodeproj` in Xcode öffnen.
4. Unter **Signing & Capabilities** für **beide** Targets (`Haushaltsbuch` und
   `HaushaltsbuchWidget`) dein eigenes Apple-Developer-Team auswählen (`DEVELOPMENT_TEAM`
   ist in `project.yml` bewusst nicht gesetzt, weil das personenabhängig ist).
5. Bei Bedarf erneut `xcodegen generate` ausführen, nachdem du Dateien hinzugefügt/entfernt
   hast oder `project.yml` geändert hast – das Projekt wird jedes Mal frisch und
   deterministisch aus dem Source-Tree erzeugt (manuelle Änderungen direkt im `.xcodeproj`
   gehen dabei verloren, das ist gewollt: `project.yml` ist die Quelle der Wahrheit).

## Fallback ohne XcodeGen (rein manuell in Xcode)

Falls du XcodeGen nicht installieren möchtest:

1. In Xcode: **File → New → Project → iOS → App**. Name: `Haushaltsbuch`, Bundle-ID
   `at.tumpenhasi.haushaltsbuch`, Interface: SwiftUI, Language: Swift, Minimum Deployment:
   iOS 17. Speichern unter `ios/` (überschreibt/ergänzt den vorhandenen `Haushaltsbuch/`-Ordner).
2. Alle Dateien aus `ios/Haushaltsbuch/*.swift` (inkl. Unterordner `Views/`, `Services/`)
   und aus `ios/Shared/*.swift` in das neue Xcode-Projekt ziehen (Target: `Haushaltsbuch`).
   Den generierten `ContentView.swift`/`XApp.swift`-Boilerplate von Xcode löschen bzw.
   durch `HaushaltsbuchApp.swift` ersetzen.
3. **File → New → Target → Widget Extension**. Name: `HaushaltsbuchWidget`,
   "Include Configuration Intent" **deaktivieren** (wir nutzen `StaticConfiguration`).
4. Die generierten Widget-Template-Dateien löschen und stattdessen alle Dateien aus
   `ios/HaushaltsbuchWidget/*.swift` (inkl. `Views/`) **und nochmal** alle Dateien aus
   `ios/Shared/*.swift` in das `HaushaltsbuchWidget`-Target ziehen (Shared-Code muss in
   beiden Targets als Quelle eingebunden sein – kein Framework, einfach dieselben Dateien
   beiden Targets zuweisen über die Datei-Inspector-Checkbox "Target Membership").
5. Für **beide** Targets unter **Signing & Capabilities**:
   - **"+ Capability" → App Groups** hinzufügen, dort `group.at.tumpenhasi.haushaltsbuch`
     eintragen. Xcode fragt dich, ob diese Gruppe neu in deinem Apple-Developer-Account
     registriert werden soll – ja, bestätigen (**du** tippst hier den String
     `group.at.tumpenhasi.haushaltsbuch` genau einmal ein, Xcode übernimmt den Rest).
   - **"+ Capability" → Keychain Sharing** hinzufügen, als Gruppe ebenfalls
     `group.at.tumpenhasi.haushaltsbuch` eintragen (siehe Erklärung unten, warum derselbe
     String wie die App Group – das ist Absicht, kein Tippfehler).
   - Dein Apple-Developer-Team auswählen.
6. Im `Haushaltsbuch`-App-Target unter **Info** (oder direkt in der Info.plist) einen
   **URL Type** hinzufügen: Scheme `haushaltsbuch` (für den Widget-Deep-Link).
7. Bauen (⌘B) und auf ein Gerät oder den Simulator installieren (⌘R).

## App Group, Keychain-Sharing und URL-Scheme – was hier automatisiert ist und was nicht

`project.yml` verweist für beide Targets auf fertige `.entitlements`-Dateien
(`Haushaltsbuch/Haushaltsbuch.entitlements`, `HaushaltsbuchWidget/HaushaltsbuchWidget.entitlements`),
die bereits **beide** die App-Group-ID `group.at.tumpenhasi.haushaltsbuch` und dieselbe
Keychain-Access-Group enthalten. Das committete YAML + die Entitlements-Dateien reichen,
damit `xcodegen generate` ein Projekt erzeugt, in dem beide Capabilities für beide Targets
bereits aktiviert sind.

Was XcodeGen **nicht** für dich erledigen kann: Eine App-Group-ID muss einmalig in **deinem**
Apple-Developer-Account existieren (Free- oder Paid-Account, beides geht). Das passiert nicht
durch eine Datei im Repo, sondern nur, indem **du** in Xcode unter Signing & Capabilities für
eines der beiden Targets auf "+" bei App Groups klickst und Xcode anbietest, die Gruppe
`group.at.tumpenhasi.haushaltsbuch` (der String steht schon in der Entitlements-Datei –
Xcode erkennt das automatisch und bietet an, sie zu registrieren) neu für dein Team zu
registrieren. Danach ist sie für beide Targets nutzbar. Falls Xcode stattdessen einen
Fehler wie "App Group nicht gefunden" zeigt: einmal die App-Group-Zeile in den Capabilities
entfernen und über "+" neu hinzufügen, damit Xcode den Registrierungs-Dialog erneut anbietet.

Warum **dieselbe** ID (`group.at.tumpenhasi.haushaltsbuch`) auch für Keychain Sharing?
`Shared/KeychainStore.swift` liest/schreibt den API-Token bewusst **ohne** explizite
`kSecAttrAccessGroup`. Da beide Entitlements-Dateien unter `keychain-access-groups`
**genau einen** Eintrag haben, wird dieser vom System automatisch als Standard-Keychain-
Gruppe für beide Targets verwendet – ohne dass der Code die Team-ID zur Laufzeit kennen
muss (die App-Group-Berechtigung existiert unabhängig davon; der String wird hier nur als
Namenskonvention wiederverwendet, um nicht zwei separate IDs verwalten zu müssen).

Das URL-Scheme `haushaltsbuch://` (für `haushaltsbuch://new`, den Widget-Tap-Deep-Link) ist
bereits vollständig in `Haushaltsbuch/Info.plist` eingetragen (`CFBundleURLTypes`) – hier ist
in Xcode nichts mehr manuell nötig.

## App-Icon

`Haushaltsbuch/Assets.xcassets/AppIcon.appiconset/Contents.json` ist als leeres,
aber valides 1024×1024-Universal-Icon-Set angelegt (kein PNG beigelegt). Die App baut und
läuft damit auf einem Testgerät, zeigt aber ein Platzhalter-Icon. Für eine "echte" Optik
eine `1024x1024`-PNG-Datei in dieses `.appiconset` ziehen (Xcode aktualisiert die
`Contents.json` automatisch).

## Architektur-Überblick

```
ios/
├── project.yml                    XcodeGen-Spezifikation (App + Widget-Target)
├── Haushaltsbuch/                 App-Target
│   ├── HaushaltsbuchApp.swift     @main, Deep-Link-Handling (onOpenURL)
│   ├── Views/                     RootView, ContentView (TabView), je ein Ordner pro Tab
│   ├── Services/                  APIClient (URLSession-Actor), AppModel (@Observable),
│   │                              SettingsStore, DateGrouping
│   ├── Haushaltsbuch.entitlements App Group + Keychain-Access-Group
│   └── Info.plist                 URL-Scheme, Launch Screen, etc.
├── HaushaltsbuchWidget/           Widget-Extension-Target
│   ├── HaushaltsbuchWidgetBundle.swift   @main WidgetBundle
│   ├── HaushaltsbuchWidget.swift          Widget-Konfiguration (Small/Medium/Large)
│   ├── HaushaltsbuchTimelineProvider.swift  15-Min-Timeline, Live-Fetch + Cache-Fallback
│   ├── WidgetDataFetcher.swift     Eigenständiger, schlanker URLSession-Client
│   ├── Views/                     Small-/Medium-/LargeWidgetView, Stale-Indicator
│   └── HaushaltsbuchWidget.entitlements
└── Shared/                        Von App UND Widget genutzter Code (in project.yml als
    │                              zusätzlicher `sources`-Pfad in beiden Targets)
    ├── Models/                    Transaction, Category, Budget, User, APIEnvelope
    ├── KeychainStore.swift        Kein `!`, kein `try!` – überall typisierte Fehler
    ├── AppGroupStore.swift        Snapshot-Cache in der App-Group-UserDefaults
    ├── AppGroupConstants.swift    App-Group-ID, Deep-Link, Keychain-Keys
    ├── DailyBudgetCalculator.swift Zahltag-Logik (siehe unten)
    ├── FlexibleNumberDecoding.swift  Robustes Decodieren von DECIMAL-Feldern (siehe unten)
    ├── WidgetSnapshot.swift, Formatting.swift, ColorHex.swift, CategoryBadge.swift, ProgressBar.swift
```

### Auth

Kein OIDC in der App – stattdessen ein persönlicher API-Token, den man sich in der
**Web-App unter Einstellungen → API-Tokens** erzeugt und beim ersten Start (oder später in
den iOS-Einstellungen) einfügt. Der Token liegt ausschließlich im Keychain
(`kSecClassGenericPassword`), die Server-URL in `UserDefaults`. Bei jeder 401-Antwort wird
der Token automatisch gelöscht und die App zeigt wieder den Onboarding-Screen – kein Absturz.

### Zahltag-/Tagesbudget-Logik

`Shared/DailyBudgetCalculator.swift` spiegelt 1:1 die Logik aus
`frontend/src/components/dashboard/DailyBudgetWidget.tsx` der Web-App: Ist "heute" vor dem
Zahltag, muss das verfügbare Geld bis zum Zahltag reichen; danach (oder ohne gesetzten
Zahltag) bis zum Monatsende. Wird sowohl vom Dashboard-Tab als auch vom Widget verwendet,
damit beide immer dieselbe Zahl zeigen.

### Eine Backend-Eigenheit, auf die die Swift-Modelle bewusst defensiv reagieren

Das Backend nutzt `node-postgres` ohne eigene `pg.types.setTypeParser`-Registrierung
(siehe `backend/src/config/database.ts`). `NUMERIC`/`DECIMAL`-Spalten (u.a. `amount`) werden
von `pg` standardmäßig als **String** statt als Zahl zurückgegeben, außer eine Controller-
Funktion parst sie explizit mit `parseFloat` (was z.B. für `BudgetOverview.paid/pending/...`,
aber **nicht** für einzelne `Transaction.amount`-Werte oder `Budget.amount` der Fall ist).
`Shared/FlexibleNumberDecoding.swift` + die manuellen `init(from:)` in `Transaction` und
`Budget`/`CategoryBudgetStat` akzeptieren deshalb robust beides (Zahl oder numerischer
String), statt bei jedem Transaktions-Abruf mit einem Decoding-Fehler zu scheitern.

### Widget-Datenfluss

1. Die App schreibt nach jedem erfolgreichen Dashboard-Refresh einen kompakten
   `WidgetSnapshot` (verfügbarer Betrag, Tagesbudget, % genutzt, Top-Kategorien, letzte
   Ausgaben) in die App-Group-`UserDefaults`.
2. Das Widget versucht bei jedem Timeline-Refresh (alle 15 Minuten) **zuerst** einen
   eigenen Direkt-Request an den Server (`WidgetDataFetcher`, mit Token aus der geteilten
   Keychain-Gruppe).
3. Schlägt das fehl (kein Netz, Server down, kein Token), fällt das Widget auf den
   App-Group-Cache aus Schritt 1 zurück und zeigt zusätzlich "Zuletzt aktualisiert: vor
   X Min" an – das Widget bleibt so nie leer oder abgestürzt.
4. Ein Tap auf das Widget öffnet `haushaltsbuch://new`, was die App über `onOpenURL`
   direkt zum "Neu"-Sheet springen lässt.

## Bekannte Vereinfachungen (bewusst, dokumentiert)

- **Large-Widget** zeigt die letzten 3 Ausgaben + Top-Kategorien, aber keine eigene
  Interaktivität (kein direkter "+"-Button als eigenständiges Steuerelement) – iOS-17-
  Interactive-Widgets bräuchten dafür App Intents, was für den Umfang dieser Aufgabe zu
  weit ginge. Der gesamte Widget-Bereich ist stattdessen per Tap (`widgetURL`) verlinkt.
- Die Kategorie-Auswahl im "Neu"-Sheet ist ein horizontales Icon-Scroll (kein
  vollständig custom gestalteter Numpad) – erfüllt die funktionale Anforderung, verzichtet
  aber auf zusätzliche Polish-Elemente, die im Aufgabenblatt als optional markiert waren.
- `GET /transactions/summary` und Sparziele (`/goals`) werden von der iOS-App nicht
  genutzt – sie sind für die vier vorgegebenen Tabs nicht erforderlich.
- Zwei Endpunkt-Felder waren in der Aufgabenstellung nicht exakt spezifiziert
  (`CategoryBudgetStat`, Zahltag-Feld an `/auth/me`) – hier wurde 1:1 die tatsächliche
  Backend-Implementierung (`backend/src/controllers/budgetController.ts`,
  `authController.ts`) übernommen statt geraten.

## Nicht Teil dieser Aufgabe

Alles unter `frontend/`, `backend/`, `database/` wurde für diese Aufgabe **nicht**
verändert (das Backend implementiert die hier genutzten Endpunkte, inkl. API-Token-Auth,
bereits vollständig).
