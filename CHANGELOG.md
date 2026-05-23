# Changelog

Alle wesentlichen Änderungen sind hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.5.0] – 2026-05 (aktuell)

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
