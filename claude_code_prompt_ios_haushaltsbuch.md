# Claude Code Prompt: iOS App + Haushaltsbuch Redesign

## Kontext

Du arbeitest an einem bestehenden selbst-gehosteten Haushaltsbuch-Projekt.
Das Projekt liegt unter: `/opt/haushaltsbuch` (auf dem Server) bzw. lokal im geklonten Repo.

**Bestehender Stack:**
- **Backend:** Node.js / Express / TypeScript, läuft als Docker Container
- **Frontend (Web):** React / TypeScript / Vite / Tailwind CSS
- **Datenbank:** PostgreSQL
- **Auth:** Pocket ID (OIDC/OAuth2) über `dex-config.yaml`
- **Deployment:** Docker Compose auf Proxmox LXC, Reverse Proxy via Zoraxy
- **Domain:** `haushaltsbuch.tumpenhasi.at`

**Bestehende API-Endpunkte (alle unter `/api`, JWT-Auth via Cookie):**
```
GET  /auth/me
GET  /transactions          ?month=&year=&category_id=&type=&status=&limit=&offset=
POST /transactions
PUT  /transactions/:id
DELETE /transactions/:id
PATCH /transactions/:id/pay
GET  /transactions/summary  ?month=&year=
GET  /transactions/sparkline ?range=7d|month|year|all

GET  /categories
POST /categories
PUT  /categories/:id
DELETE /categories/:id

GET  /budgets
POST /budgets               { category_id, month, year, amount }
DELETE /budgets/:id
GET  /budgets/overview      ?month=&year=

GET  /recurring
POST /recurring
PUT  /recurring/:id
DELETE /recurring/:id
PATCH /recurring/:id/toggle
GET  /recurring/preview
GET  /recurring/materialize

GET  /goals
POST /goals
PUT  /goals/:id
DELETE /goals/:id
POST /goals/:id/deposit

GET  /export/csv
GET  /export/pdf
```

**Wichtige TypeScript-Typen (bereits vorhanden):**
```typescript
interface Transaction {
  id: string; user_id: string; category_id: string | null;
  type: 'income' | 'expense'; amount: number; description: string | null;
  date: string; status: 'bezahlt' | 'ausstehend';
  category_name?: string; category_icon?: string; category_color?: string;
}

interface BudgetOverview {
  month: number; year: number; totalBudget: number; totalIncome: number;
  paid: number; pending: number; available: number; budgetBase: number;
  usedPercent: number; categoryBudgets: Budget[]; byCategory: CategoryBudgetStat[];
  pendingTransactions: Transaction[];
}

interface SavingsGoal {
  id: string; name: string; icon: string; color: string;
  target_amount: number; current_amount: number;
  deadline: string | null; progress_percent: number;
}
```

---

## Aufgabe 1: Web-Frontend komplett überarbeiten

### Design-Ziel
Das aktuelle Design ist funktional aber generisch. Überarbeite es zu einem **modernen, eigenständigen Finanz-Dashboard** mit folgenden Anforderungen:

**Visuelles Konzept:**
- Dunkel-first Design (Dark Mode ist primär, Light Mode optional)
- Klare Hierarchie: Zahlen müssen sofort lesbar sein (große, kontrastreiche Schrift für Beträge)
- Verwendung von `Inter` oder `DM Sans` für UI-Text, `JetBrains Mono` oder `DM Mono` für Geldbeträge
- Farbpalette: Dunkles Blau-Grau als Basis (`#0F1117`, `#1A1D27`), Akzentfarbe Indigo/Violett (`#6366F1`), Grün für Einnahmen (`#10B981`), Rot für Ausgaben (`#EF4444`)
- Keine generischen Gradient-Blobs, keine übermäßigen Schatten – stattdessen klare Flächen, subtile Borders

**Konkrete UI-Verbesserungen:**

1. **Dashboard-Seite neu gestalten:**
   - Hero-Bereich: Großes verfügbares Guthaben mit Fortschrittsring (wie ein Tacho), darunter Tages-Budget-Widget (mit Zahltag-Logik – Zahltag wird in `localStorage` unter `hb_payday` gespeichert)
   - Kompakte Kategorie-Budget-Kacheln mit Fortschrittsbalken
   - Cashflow-Chart bleibt, aber mit neuem Farbschema
   - Ausstehende Ausgaben als prominent gestaltete "Action Items"

2. **Transaktionen-Seite:**
   - Gruppierung nach Datum (heute, gestern, diese Woche...)
   - Wisch-Geste zum Löschen / Als bezahlt markieren (swipe-to-action)
   - Schnell-Filter Chips für Kategorie / Status / Typ

3. **Neue Schnelleingabe (floating action button):**
   - `+` Button unten rechts, öffnet ein Bottom-Sheet
   - Felder: Betrag (Numpad-optimiert), Typ (Ausgabe/Einnahme), Kategorie, Beschreibung, Datum
   - Smart-Defaults: Typ = Ausgabe, Datum = heute, Status = bezahlt
   - Kategorie-Auswahl als horizontales Icon-Scroll

4. **Budget-Seite:**
   - Monats-Budget als großer Ring-Chart
   - Pro-Kategorie Budget-Karten mit verbleibenden Tagen und Warnung ab 80%
   - Zahltag-Einstellung prominent sichtbar

5. **Sparziele:**
   - Karten-Layout mit Fortschrittsring
   - "Einzahlen"-Button direkt auf der Karte

**Warnungs-System (bereits teilweise implementiert, bitte verfeinern):**
- `DailyBudgetWidget.tsx` und `BudgetAlerts.tsx` existieren bereits
- Zahltag (`hb_payday` in localStorage) bestimmt ob "Geld muss bis Zahltag reichen" oder "bis Monatsende"
- Warnungen bei >80% Budget-Verbrauch, zu hohem Ausgabentempo, überzogenen Kategorien

---

## Aufgabe 2: iOS App mit SwiftUI

### Technische Anforderungen

**Setup:**
- SwiftUI + Swift 5.9+, iOS 17+ minimum
- Zielgerät: iPhone (iPad optional)
- Neues Xcode-Projekt anlegen unter `./ios/Haushaltsbuch.xcodeproj`
- Keine externen Package-Dependencies außer was Apple mitliefert (kein CocoaPods, kein SPM-Drittanbieter)

**Authentifizierung:**
- Die Web-App nutzt Pocket ID / OIDC. Die iOS-App soll **API-Token-Auth** verwenden.
- Implementiere einen separaten API-Token-Endpunkt im Backend:
  ```
  POST /api/auth/token    { email, password }  → { token: string }
  ```
  Alternativ: Generiere in der Web-App unter Einstellungen einen persönlichen API-Token der in der iOS-App eingegeben wird (einfacher und sicherer).
- Token wird im iOS Keychain gespeichert (`SecItemAdd` / `SecItemCopyMatching`)
- Alle API-Calls nutzen `Authorization: Bearer <token>` Header
- Base-URL wird beim ersten Start eingegeben (z.B. `https://haushaltsbuch.tumpenhasi.at/api`)

**App-Struktur (TabView):**

```
TabView:
├── 📊 Dashboard
├── ➕ Neu (direkt zum Eingabe-Sheet)
├── 📋 Transaktionen
└── ⚙️ Einstellungen
```

**Tab 1 – Dashboard:**
- Aktueller Monat, Monat wechselbar
- Verfügbares Budget groß angezeigt
- Tagesbudget-Widget (mit Zahltag-Logik, Zahltag in UserDefaults)
- Kategorie-Fortschrittsbalken
- Liste der letzten 5 Transaktionen
- Ausstehende Ausgaben als Sektion mit "Als bezahlt" Button

**Tab 2 – Neu (Hauptfunktion):**
- Direkt beim Tippen auf Tab öffnet sich ein Sheet
- Numpad für Betrag (groß, zentriert, sofort fokussiert)
- Typ-Toggle: Ausgabe 🔴 / Einnahme 🟢
- Kategorie-Picker: horizontales Scroll mit Icon + Name
- Beschreibungs-Textfeld
- Datum-Picker (default: heute)
- Status-Toggle: Bezahlt / Ausstehend
- "Speichern" Button – schließt Sheet und refresht Dashboard

**Tab 3 – Transaktionen:**
- Liste aller Transaktionen, gruppiert nach Datum
- Monats-Selektor oben
- Swipe-to-Delete (mit Bestätigung)
- Swipe-to-Pay (Als bezahlt markieren)
- Filter nach Kategorie / Typ

**Tab 4 – Einstellungen:**
- Server-URL ändern
- API-Token anzeigen / neu generieren (Link zur Web-App)
- Zahltag einstellen (1-31)
- App-Version

**Design-Anforderungen iOS:**
- Folge Apple Human Interface Guidelines
- Dark Mode support (System-Setting respektiert)
- SF Symbols für Icons
- Kategorie-Farben aus der API verwenden (hex → Color)
- Smooth Animations für Sheet-Übergänge (`spring()`)
- Haptic Feedback beim Speichern (`UIImpactFeedbackGenerator`)

---

## Aufgabe 3: iOS Home-Screen Widget

### Widget-Typen (WidgetKit)

Erstelle **drei Widget-Größen** in einer Widget Extension (`HaushaltsbuchWidget`):

**Small Widget:**
```
┌─────────────────┐
│ 💰 Heute        │
│                 │
│   €12,50        │
│   noch frei     │
│                 │
│ Aug · 68% genutzt│
└─────────────────┘
```

**Medium Widget:**
```
┌─────────────────────────────────┐
│ Tagesbudget          Aug 2026   │
│                                 │
│   €12,50 noch heute             │
│   ████████████░░░░ 68%          │
│                                 │
│ 🛒 €45  ⛽ €30  🎬 €12         │
└─────────────────────────────────┘
```

**Large Widget:**
```
┌─────────────────────────────────┐
│ Haushaltsbuch        Aug 2026   │
│ Verfügbar: €1.160,00            │
│ ████████████████░░░ 68%         │
│                                 │
│ Heute: €12,50 pro Tag           │
│ Zahltag in 6 Tagen              │
│                                 │
│ Letzte Ausgaben:                │
│ Rewe          -€ 45,00          │
│ Shell         -€ 30,00          │
│ Netflix       -€ 12,99          │
│                                 │
│ [+ Ausgabe hinzufügen]          │
└─────────────────────────────────┘
```

**Widget-Implementierung:**
- `TimelineProvider` mit 15-Minuten-Refresh
- Daten werden über `AppGroup` (`group.at.tumpenhasi.haushaltsbuch`) mit der Haupt-App geteilt
- Widget-Tap → öffnet direkt das "Neue Ausgabe" Sheet in der App (via Deep Link `haushaltsbuch://new`)
- Hintergrund-Fetch im Widget selbst mit `URLSession` (shared session, kein Login nötig da Token im Keychain/AppGroup)
- Fehlerstate anzeigen wenn API nicht erreichbar

---

## Aufgabe 4: Backend-Erweiterungen

### 4.1 API-Token-Authentifizierung

Füge zur bestehenden Auth ein Token-System hinzu:

```sql
-- Neue Migration: 008_api_tokens.sql
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON api_tokens(token);
```

```typescript
// Neue Routen:
GET  /api/auth/tokens         → Liste aller eigenen Tokens
POST /api/auth/tokens         { name } → generiert neuen Token (crypto.randomBytes(32).toString('hex'))
DELETE /api/auth/tokens/:id   → Token löschen
```

Die bestehende `authenticate` Middleware soll **sowohl** OIDC-Session-Cookie **als auch** `Authorization: Bearer <token>` akzeptieren.

### 4.2 Push Notifications (optional, nice-to-have)

Falls Zeit bleibt:
- Neuer Endpunkt `POST /api/push/subscribe` nimmt APNs Device Token entgegen
- Tägliche Erinnerung "Ausgaben von heute eintragen?" via node-cron
- Budget-Warnung wenn >80% überschritten

---

## Aufgabe 5: Web-App Einstellungs-Seite

Füge eine neue Seite `/einstellungen` hinzu (Link in der Sidebar):

- **API-Tokens:** Liste + "Neuen Token erstellen" Button + Kopier-Button + Löschen
- **Zahltag:** Eingabe 1-31 (wird in DB gespeichert, nicht mehr localStorage)
- **Profil:** Name / E-Mail (read-only, kommt von OIDC)
- **Kategorien verwalten:** Create / Edit / Delete (war bisher unter Kategorien-Seite)
- **Daten exportieren:** CSV / PDF Buttons (bereits implementiert)
- **Danger Zone:** Alle Transaktionen eines Monats löschen

---

## Technische Hinweise & Constraints

### Deployment
- Docker Compose bleibt unverändert (`docker-compose.yml`)
- Neue DB-Migrations als `database/migrations/008_api_tokens.sql` etc.
- iOS App wird lokal gebaut und via Xcode auf dem iPhone installiert (kein App Store)

### Fehlerbehandlung
- Alle API-Calls in der iOS App mit `do/catch`, bei 401 → Token-Eingabe-Screen
- Netzwerkfehler freundlich anzeigen, nicht abstürzen
- Offline-Indikator im Widget ("Zuletzt aktualisiert: vor 5 Min")

### Code-Qualität
- TypeScript strict mode bleibt aktiviert
- Swift: kein `!` force-unwrap, kein `try!`
- Kommentare auf Deutsch (konsistent mit bestehender Codebasis)

### Priorisierung
Falls nicht alles in einer Session machbar ist, folge dieser Reihenfolge:
1. ✅ Backend API-Token-System (Aufgabe 4.1) – alles andere hängt davon ab
2. ✅ iOS App Grundgerüst mit Auth + Dashboard + Schnelleingabe (Aufgabe 2)
3. ✅ Home-Screen Widget klein + medium (Aufgabe 3)
4. ✅ Web-Frontend Redesign (Aufgabe 1)
5. ⬜ Einstellungs-Seite Web (Aufgabe 5)
6. ⬜ Widget groß + Push Notifications (optional)

---

## Abschluss

Wenn du fertig bist, erstelle bitte:
1. `ios/README.md` mit Anleitung zum Bauen und Installieren der iOS App
2. Aktualisiere `CHANGELOG.md` mit den Änderungen
3. Führe `docker compose up -d --build` aus um sicherzustellen dass alles baut
