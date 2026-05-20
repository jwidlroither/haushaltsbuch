# 🗺️ Haushaltsbuch – Roadmap

> Zuletzt aktualisiert: Mai 2026
> Status: ✅ Fertig · 📋 Geplant · 💡 Idee

---

## ✅ v1.0 – MVP
SSO (OIDC/Pocket ID), Transaktionen, Kategorien, Dashboard, Dark Mode, Docker

## ✅ v1.1 – Budgetplanung
Status bezahlt/ausstehend, Gesamtbudget, Kategorie-Budgets,
Echtzeit-Budget-Bar, PendingList, Ein-Klick bezahlen

## ✅ v1.2 – Stabilität & UX
- Bugfixes (Route-Konflikt, Budget-NULL-Constraint, Token-Ablauf)
- Toast-System, Skeleton-Screens, Monatswechsel-Animation
- Keyboard-Navigation (Tab-Trap, Escape, ARIA)
- PWA (Manifest, Service Worker, offline-fähig)
- DE-Betragseingabe (Komma als Dezimaltrenner)
- Backend: DB-Retry, Request-IDs, ENV-Validierung, OIDC Cleanup-Job
- Tests: Jest (Auth, Validation, Budget-Logik)
- OpenAPI 3.0 + Swagger UI (/api/docs)
- GitHub Actions CI, Backup-Scripts, CONTRIBUTING.md

---

## 📋 v1.3 – Wiederkehrende Transaktionen

- Wiederkehrende Buchungen (täglich/wöchentlich/monatlich/jährlich)
- Automatische Erstellung ausstehender Buchungen zu Monatsbeginn
- Verwaltungsseite für Serien (pausieren, löschen)
- Vorschau: „Diese Fixkosten fallen nächsten Monat an"

## 📋 v1.4 – Reporting & Export

- Monats- und Jahresberichte als PDF
- CSV-Export aller Transaktionen
- Jahresübersicht mit Monatsvergleich
- Sparquote-Berechnung

## 📋 v1.5 – Sparziele

- Sparziele (Name, Zielbetrag, Deadline)
- Fortschrittsanzeige, Dashboard-Widget
- Transaktion einem Ziel zuweisen

## 📋 v1.6 – Mehrere Konten

- Girokonto, Sparkonto, Bar, etc.
- Kontostand-Tracking, Transfers, Nettovermögen

## 💡 v2.0 – KI-Features

- Automatische Kategorisierung via Claude API
- Monats-Zusammenfassung in natürlicher Sprache
- Anomalie-Erkennung, Ausgabe-Prognose

## 💡 Weitere Ideen

- Multi-User / Haushalt teilen
- Bank-CSV-Import
- Belege fotografieren
- Mehrwährung
