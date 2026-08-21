# 🤝 Contributing Guide – Haushaltsbuch

Danke für dein Interesse! Hier sind die wichtigsten Infos zum Mitmachen.

---

## 📋 Voraussetzungen

- Node.js 20+
- Docker & Docker Compose
- Git

---

## 🚀 Lokale Entwicklung

```bash
# 1. Repo klonen
git clone https://github.com/yourname/haushaltsbuch.git
cd haushaltsbuch

# 2. Umgebungsvariablen setzen
cp .env.example .env
# .env bearbeiten (OIDC-Werte eintragen)

# 3. Starten (mit lokalem Dex OIDC-Provider)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile oidc-dev up -d

# 4. Frontend separat für Hot-Reload
cd frontend && npm install && npm run dev

# 5. Backend separat für Hot-Reload
cd backend && npm install && npm run dev
```

---

## 🌿 Branching-Strategie

```
main          ← Produktions-Branch (nur via PR)
develop       ← Integrations-Branch
feature/xyz   ← Feature-Branches (von develop)
fix/xyz       ← Bugfix-Branches (von develop oder main)
```

**Workflow:**
```bash
git checkout develop
git pull
git checkout -b feature/mein-feature
# ... entwickeln ...
git push origin feature/mein-feature
# → Pull Request auf develop
```

---

## ✍️ Commit-Konventionen

Format: `type(scope): kurze Beschreibung`

| Typ        | Wann                                 |
|------------|--------------------------------------|
| `feat`     | Neue Funktion                        |
| `fix`      | Bugfix                               |
| `docs`     | Nur Dokumentation                    |
| `style`    | Formatierung, kein Logik-Änderung    |
| `refactor` | Code-Umstrukturierung ohne neue Funktion |
| `test`     | Tests hinzufügen oder anpassen       |
| `chore`    | Build, Abhängigkeiten, CI            |

**Beispiele:**
```
feat(budget): Budget-Rollover in Folgemonat übertragen
fix(auth): Session-State überlebt jetzt HTTPS-Redirects
docs(readme): HTTPS-Setup-Anleitung ergänzt
test(validation): Zod-Schema-Tests für Transaktionen
```

---

## 🧪 Tests ausführen

```bash
# Backend Tests
cd backend
npm install
npm test               # Einmalig
npm run test:watch     # Watch-Mode
npm run test:coverage  # Mit Coverage-Report

# Frontend TypeScript-Check
cd frontend
npm install
npx tsc --noEmit
```

---

## 📐 Code-Stil

**Backend:**
- TypeScript strict mode
- Zod für Input-Validierung (kein `any`)
- Alle DB-Queries über `query()` Wrapper (kein direktes Pool-Zugriff)
- Logger statt `console.log`

**Frontend:**
- Tailwind CSS-Klassen (keine Inline-Styles außer für dynamische Farben)
- Komponenten unter `src/components/`, Seiten unter `src/pages/`
- Hooks unter `src/hooks/`
- Toast für User-Feedback (kein `alert()`)

---

## 🗄️ Datenbank-Migrationen

Neue Migrationen als `0XX_beschreibung.sql` in `database/migrations/` anlegen.
Auf bestehenden Datenbanken manuell ausführen (in `docs/UPGRADE.md` dokumentieren).

---

## 🔍 Pull Request Checkliste

- [ ] TypeScript baut ohne Fehler (`tsc --noEmit`)
- [ ] Tests laufen grün (`npm test`)
- [ ] Neue Features haben Tests
- [ ] DB-Migrationen sind in `docs/UPGRADE.md` dokumentiert
- [ ] `.env.example` aktualisiert (wenn neue ENV-Vars)
- [ ] Keine `console.log` im Code (nur `logger.*`)
