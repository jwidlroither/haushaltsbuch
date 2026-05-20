# ✅ TODO – Haushaltsbuch

> Technische Aufgaben, Bugfixes und Verbesserungen.
> Für Feature-Planung → siehe [ROADMAP.md](./ROADMAP.md)

---

## 🔴 Kritisch / Bugs

- [x] Route-Konflikt Backend (statische vor Param-Routen)
- [x] Budget UNIQUE Constraint mit NULL (partieller Index)
- [x] Token-Ablauf → Toast + Redirect nach 1.5s

---

## 🟡 Verbesserungen

### Backend
- [x] Input-Sanitierung (.trim() in Zod-Schemas)
- [x] DB-Verbindungsfehler Retry (exponential backoff, 5 Versuche)
- [x] Health-Check (DB + OIDC)
- [x] Rate-Limit Auth-Routen (10/Min)
- [x] OIDC State Cleanup (Node-seitiger Background-Job, alle 5 Min)
- [x] Logging-Level per ENV (LOG_LEVEL)
- [x] Environment-Validierung beim Start (Zod, Exit mit Klartext-Fehler)
- [x] Request-IDs (x-request-id Header)
- [ ] Pagination für Kategorien (low priority – typisch <50 Kategorien pro User)

### Frontend
- [x] Toast-System (useToast Hook + ToastContainer)
- [x] Skeleton-Screens (Dashboard, Cards, Transaktionsliste)
- [x] Monatswechsel Animation (slide-in-left/right)
- [x] Keyboard-Navigation Modal (Tab-Trap, Escape, Focus-Restore, ARIA)
- [x] PWA Manifest + Service Worker + Icons
- [x] Betrag-Eingabe DE-Lokalisierung (Komma als Dezimaltrenner)
- [x] useMonthNav Hook (wiederverwendbar in Dashboard + Transaktionsseite)
- [x] MonthSelector Komponente (mit Animation + Loading-Spinner)

---

## 🟢 Code-Qualität

### Backend
- [x] Environment-Validierung (Zod)
- [x] Request-IDs
- [x] Tests: Jest + Supertest (4 Test-Dateien, ~20 Tests)
  - format.test.ts (OIDC State Encoding)
  - auth.middleware.test.ts (JWT Validierung)
  - validation.test.ts (Zod Schemas)
  - budget.logic.test.ts (Budget-Berechnungen)
- [x] OpenAPI 3.0 Spec (vollständig, alle Endpunkte)
- [x] Swagger UI unter /api/docs
- [ ] DB-Migrations-Tool (node-pg-migrate) – nice-to-have
- [ ] Integration-Tests mit echter Test-DB

### Frontend
- [ ] React Query / SWR – nice-to-have, aktuell ausreichend
- [ ] Vitest + Testing Library – nächste Runde
- [ ] Bundle-Analyse (vite-bundle-visualizer)

---

## 🔵 DevOps

- [x] GitHub Actions CI (TypeScript-Check, Build, npm audit)
- [x] .dockerignore (Backend + Frontend)
- [x] Ressourcen-Limits in docker-compose
- [x] Backup-Script (7-Tage-Rotation) + Restore-Script
- [x] HTTPS-Setup Dokumentation (docs/HTTPS_SETUP.md)
- [ ] OIDC State Cron via pg_cron (Node-Job reicht für jetzt)

---

## 📝 Dokumentation

- [x] HTTPS-Guide (docs/HTTPS_SETUP.md)
- [x] Upgrade-Anleitung (docs/UPGRADE.md)
- [x] API-Dokumentation vollständig (OpenAPI + Swagger UI)
- [x] CONTRIBUTING.md (Branching, Commits, Tests, PR-Checkliste)
- [ ] CHANGELOG.md

---

## 💬 Offene Fragen – Entschieden

- **OIDC State Cron**: Node-seitiger Job gewählt (kein pg_cron nötig) ✅
- **Währung**: Bleibt EUR hardcoded – Internationalisierung ist v3.0-Thema
- **Budget-Rollover**: Wird in v1.2 Wiederkehrende Transaktionen als separates Feature betrachtet
