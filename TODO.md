# ✅ TODO – Haushaltsbuch

## ✅ Kritische Bugs (alle behoben)
- [x] Route-Konflikt, Budget NULL Constraint, Token-Ablauf Toast

## ✅ Backend-Stabilität
- [x] DB-Retry, Health-Check, Rate-Limit, OIDC Cleanup-Job
- [x] ENV-Validierung, Request-IDs, Logging-Level
- [x] Jest Tests, OpenAPI + Swagger UI

## ✅ Frontend-UX
- [x] Toast-System, Skeleton-Screens, Monatswechsel-Animation
- [x] Keyboard-Navigation Modal, PWA, DE-Betragseingabe
- [x] MonthSelector Hook + Komponente
- [x] Vitest + 3 Test-Dateien

## ✅ Features
- [x] v1.1 Budget (bezahlt/ausstehend, Gesamtbudget, Kategorie-Budget)
- [x] v1.2 UX-Stabilität (Toast, Skeleton, PWA, OpenAPI, Tests, CI)
- [x] v1.3 Wiederkehrende Transaktionen (CRUD, Auto-Materialize, Vorschau)
- [x] v1.4 CSV-Export
- [x] v1.5 PDF-Export (pdfkit, Monatsreport)
- [x] v1.5 Sparziele (CRUD, Einzahlungen, Progress, GoalsWidget)
- [x] React Query (Categories, App-Provider)
- [x] Dashboard: UpcomingWidget + GoalsWidget
- [x] CHANGELOG.md

## 📋 Nächste Runde (priorisiert)
- [ ] React Query in alle Pages (Transactions, Dashboard, Recurring, Goals)
- [ ] Wiederkehrende im Budget-Overlay anzeigen (Fixkosten-Vorschau)
- [ ] Statistik-Seite: Jahresüberblick, Sparquote, Ausgabentrends
- [ ] Integration-Tests (Supertest mit Test-DB)
- [ ] i18n-Vorbereitung (Sprachstruktur, DE vollständig)
- [ ] Multi-Device: Websocket-Invalidierung via React Query
