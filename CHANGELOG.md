# Changelog

Alle wesentlichen Änderungen sind hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.6.0] – 2026-08 (aktuell)

### Neu
- **iOS App (SwiftUI, iOS 17+)** – natives Dashboard, Schnelleingabe, Transaktionsliste
  (Swipe-to-Delete/Pay) und Einstellungen unter `ios/`, siehe `ios/README.md`
- **Home-Screen-Widget** (Small/Medium/Large, WidgetKit) mit 15-Min-Refresh, geteiltem
  App-Group-Cache und Deep-Link `haushaltsbuch://new`
- **Persönliche API-Tokens** – `GET/POST/DELETE /api/auth/tokens`, erlauben Bearer-Auth
  ohne OIDC-Browser-Flow (für iOS-App und andere Clients)
- **`/einstellungen`-Seite** – API-Token-Verwaltung, Zahltag, Profil (read-only),
  Link zu Kategorien, CSV/PDF-Export, Danger Zone (Monat löschen)
- **`DELETE /api/transactions/by-month`** – Bulk-Löschen aller Transaktionen eines Monats
- Dark-first Redesign: neue Indigo/Grün/Rot-Palette, Dashboard-Hero mit Ring-Fortschritt,
  Kategorie-Budget-Kacheln, gruppierte Transaktionsliste (Heute/Gestern/…), Quick-Filter-Chips,
  Floating-Action-Button mit Bottom-Sheet-Schnelleingabe

### Verbessert
- Zahltag wird jetzt serverseitig gespeichert (`users.payday`) statt in `localStorage`
  (`hb_payday`) – gemeinsame Quelle für Web und iOS
- `PendingList` als prominente Action-Item-Karten statt einfacher Liste

---

## [1.5.0] – 2026-05

### Neu
- **Sparziele** – Ziele anlegen mit Fortschrittsbalken, Zieldatum, Farbe & Icon
- **Einzahlungen** – Betrag auf ein Ziel einzahlen, automatische Fertigmeldung
- **Goals-Widget** im Dashboard – Top 3 aktive Ziele auf einen Blick
- **Demnächst-Widget** im Dashboard – Nächste wiederkehrende Buchungen
- **PDF-Export** – Vollständiger Monatsreport mit KPI-Zusammenfassung, Kategorie-Balkendiagramm und Transaktions-Tabelle
- **React Query** – Besseres Datencaching, automatische Refetches, optimistisches Loading
- **Vitest** – Frontend-Tests (Format, Budget-Logik, Betragsparser)

### Verbessert
- CategoriesPage nutzt React Query (instant Updates, kein manuelles Reload)
- Dashboard zweispaltig: Ausstehende + Demnächst nebeneinander
- PDF-Download-Button direkt im Dashboard-Header

---

## [1.4.0] – 2026-05

### Neu
- **CSV-Export** – Alle Transaktionen als CSV, mit Filtern (Monat, Typ, Status)
- BOM-Header für Excel-Kompatibilität (UTF-8)
- Download-Button in Transaktionsseite

---

## [1.3.0] – 2026-05

### Neu
- **Wiederkehrende Transaktionen** – CRUD, 4 Intervalle (monatlich/wöchentlich/jährlich/vierteljährlich)
- **Auto-Materialisierung** – Beim Login + stündlicher Hintergrund-Job
- **3-Monats-Vorschau** – Gruppiert nach Monat mit Monatssaldo
- Pause/Aktivieren von Buchungen
- Sidebar-Eintrag „↻ Wiederkehrend"

---

## [1.2.0] – 2026-05

### Neu
- **Toast-System** – Globale Erfolgs-/Fehlermeldungen
- **Skeleton-Screens** – Ladeanimationen für Dashboard und Listen
- **PWA** – Manifest, Service Worker, offline-fähig, Homescreen-Icon
- **Keyboard-Navigation** – Modal Tab-Trap, Escape, Focus-Restore, ARIA
- **Monatswechsel-Animation** – Slide-in left/right
- **DE Betragseingabe** – Komma als Dezimaltrennzeichen
- **MonthSelector** – Wiederverwendbare Komponente mit Animation
- **OIDC State Cleanup-Job** – Alle 5 Min, Node-seitig
- **OpenAPI 3.0** + Swagger UI unter `/api/docs`
- **Jest Backend-Tests** (Auth, Validation, Budget-Logik)
- **GitHub Actions CI**
- **Backup-Scripts** (7-Tage-Rotation)
- Ressourcen-Limits in docker-compose

### Behoben
- Route-Konflikt `/transactions/summary` vs `/:id`
- Budget NULL UNIQUE Constraint
- Token-Ablauf → Toast + Redirect

---

## [1.1.0] – 2026-05

### Neu
- **Status-Feld** – `bezahlt` / `ausstehend` für Ausgaben
- **Budgetplanung** – Gesamtbudget + pro Kategorie
- **Echtzeit-Budget-Bar** – `Budget − bezahlt − ausstehend = frei verfügbar`
- **PendingList** – Ausstehende Ausgaben im Dashboard
- **Ein-Klick bezahlen** – `PATCH /transactions/:id/pay`
- **Status-Filter** in der Transaktionsliste

---

## [1.0.0] – 2026-05

### Erste Version
- SSO via OIDC / Pocket ID (Authorization Code Flow + PKCE)
- Transaktionen erfassen (Einnahmen & Ausgaben)
- Kategorien verwalten (Icons, Farben, Typen)
- Dashboard (KPI-Cards, Donut-Chart, 6-Monats-Trend)
- Filter nach Monat, Typ, Kategorie
- Dark Mode (System + manuell)
- Responsive Design (Mobile + Desktop)
- 20 Standard-Kategorien (Auto-Seed beim ersten Login)
- Docker Compose (Frontend, Backend, DB, Nginx)
