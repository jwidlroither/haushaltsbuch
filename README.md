# 📒 Haushaltsbuch

Ein moderner, produktionsnaher Expense Tracker mit SSO-Authentifizierung via OpenID Connect (OIDC), kompatibel mit [Pocket ID](https://github.com/stonith404/pocket-id) und anderen OIDC-Providern.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

---

## ✨ Features

- **SSO-Anmeldung** via OIDC (Authorization Code Flow + PKCE)
- **Einnahmen & Ausgaben** erfassen mit Kategorie, Datum, Beschreibung
- **Dashboard** mit Monatsübersicht, Diagrammen und Saldo
- **Kategorien verwalten** (Icons, Farben, Typen)
- **Filter** nach Monat, Typ und Kategorie
- **Dark Mode** (automatisch via System-Einstellung + manueller Toggle)
- **Responsive Design** – Mobile & Desktop
- **20 Standard-Kategorien** werden beim ersten Login automatisch angelegt

---

## 🏗️ Architektur

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Browser   │────▶│    Nginx     │────▶│  Frontend      │
│             │     │  (Reverse    │     │  React + Vite  │
│             │     │   Proxy)     │     │  Port 80       │
│             │     └──────┬───────┘     └────────────────┘
│             │            │
│             │            ▼
│             │     ┌──────────────┐     ┌────────────────┐
│             │     │   Backend    │────▶│  PostgreSQL    │
│             │     │  Express.js  │     │  Port 5432     │
│             │     │  Port 3001   │     └────────────────┘
└─────────────┘     └──────┬───────┘
                           │ OIDC
                           ▼
                    ┌──────────────┐
                    │  Pocket ID   │
                    │  (oder Dex)  │
                    └──────────────┘
```

### Ordnerstruktur

```
haushaltsbuch/
├── docker-compose.yml          # Produktions-Setup
├── docker-compose.dev.yml      # Entwicklungs-Override
├── dex-config.yaml             # Lokaler OIDC-Provider (Dev)
├── .env.example                # Umgebungsvariablen-Vorlage
│
├── nginx/
│   └── nginx.conf              # Reverse-Proxy-Konfiguration
│
├── database/
│   └── migrations/
│       └── 001_init.sql        # Schema + Seed-Daten
│
├── backend/                    # Node.js / Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts        # Konfiguration aus ENV
│   │   │   ├── database.ts     # PostgreSQL Pool
│   │   │   └── oidc.ts         # OIDC Client Setup
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── transactionsController.ts
│   │   │   └── categoriesController.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT-Validierung
│   │   │   └── errorHandler.ts
│   │   ├── routes/index.ts
│   │   ├── utils/logger.ts     # Winston Logging
│   │   └── index.ts            # App Entry Point
│   ├── Dockerfile
│   └── Dockerfile.dev
│
└── frontend/                   # React + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── layout/AppLayout.tsx
    │   │   ├── ui/Modal.tsx
    │   │   ├── charts/
    │   │   │   ├── CategoryChart.tsx  (Recharts PieChart)
    │   │   │   └── TrendChart.tsx     (Recharts AreaChart)
    │   │   ├── dashboard/SummaryCards.tsx
    │   │   └── transactions/
    │   │       ├── TransactionForm.tsx
    │   │       └── TransactionItem.tsx
    │   ├── context/
    │   │   ├── AuthContext.tsx
    │   │   └── ThemeContext.tsx
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── AuthCallbackPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── TransactionsPage.tsx
    │   │   └── CategoriesPage.tsx
    │   ├── services/api.ts     # Axios API Client
    │   ├── types/index.ts      # TypeScript Types
    │   └── utils/format.ts     # Formatierungshilfen
    ├── Dockerfile
    └── Dockerfile.dev
```

---

## 🚀 Schnellstart

### Voraussetzungen

- Docker & Docker Compose v2+
- Ein OIDC-Provider (Pocket ID, Keycloak, Auth0, oder lokales Dex für Entwicklung)

### 1. Repository klonen

```bash
git clone https://github.com/yourname/haushaltsbuch.git
cd haushaltsbuch
```

### 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Pflichtfelder in `.env` anpassen:

```env
# Datenbank
DB_PASSWORD=sicheres-passwort-hier

# OIDC (Pocket ID Beispiel)
OIDC_ISSUER_URL=https://deine-pocket-id-instanz.example.com
OIDC_CLIENT_ID=haushaltsbuch
OIDC_CLIENT_SECRET=dein-client-secret
OIDC_REDIRECT_URI=http://localhost/api/auth/callback

# Sicherheit (je 64 zufällige Zeichen)
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
```

### 3. Starten

```bash
docker-compose up -d
```

Die App ist unter **http://localhost** erreichbar.

---

## 🔧 Entwicklung

### Mit lokalem OIDC-Provider (Dex)

Für lokale Entwicklung ohne externen OIDC-Provider:

```bash
# .env für lokale Entwicklung
OIDC_ISSUER_URL=http://localhost:5556/dex
OIDC_CLIENT_ID=haushaltsbuch
OIDC_CLIENT_SECRET=dev-secret-change-in-production
OIDC_REDIRECT_URI=http://localhost:3001/api/auth/callback

# Starten mit Dex
docker-compose -f docker-compose.yml -f docker-compose.dev.yml --profile oidc-dev up

# Testbenutzer:
# E-Mail: test@example.com
# Passwort: password
```

### Ohne Docker (direkte Entwicklung)

**Backend:**
```bash
cd backend
npm install
# .env im backend-Verzeichnis anlegen (oder Symlink)
npm run dev   # Startet auf Port 3001 mit Hot-Reload
```

**Frontend:**
```bash
cd frontend
npm install
# VITE_API_URL=http://localhost:3001/api in .env.local setzen
npm run dev   # Startet auf Port 5173 mit HMR
```

**Datenbank lokal:**
```bash
docker-compose up postgres -d
psql -h localhost -U haushalt -d haushaltsbuch < database/migrations/001_init.sql
```

---

## 🔐 OIDC-Konfiguration

### Pocket ID

1. In Pocket ID einen neuen OIDC-Client anlegen
2. **Redirect URI:** `https://deine-domain.com/api/auth/callback`
3. **Post-Logout Redirect URI:** `https://deine-domain.com`
4. **Client ID und Secret** in `.env` eintragen
5. **Grant Type:** Authorization Code
6. **PKCE:** Wird automatisch vom Backend verwendet

### Andere Provider

| Provider   | `OIDC_ISSUER_URL`                                        |
|------------|----------------------------------------------------------|
| Pocket ID  | `https://your-pocket-id.example.com`                     |
| Keycloak   | `https://keycloak.example.com/realms/myrealm`            |
| Auth0      | `https://your-tenant.auth0.com`                          |
| Authentik  | `https://authentik.example.com/application/o/app-slug/`  |
| Dex (Dev)  | `http://localhost:5556/dex`                              |

---

## 🗄️ Datenbankschema

```sql
users          -- OIDC-Benutzer (automatisch angelegt)
categories     -- Einnahmen/Ausgaben-Kategorien (pro Benutzer)
transactions   -- Einzelne Buchungen
```

Standard-Kategorien werden beim ersten Login jedes Benutzers automatisch kopiert.

---

## 🌐 API-Endpunkte

### Authentifizierung

| Method | Endpoint              | Beschreibung                        |
|--------|-----------------------|-------------------------------------|
| GET    | `/api/auth/login`     | OIDC-Login initiieren (Redirect)    |
| GET    | `/api/auth/callback`  | OIDC-Callback (wird von Provider aufgerufen) |
| POST   | `/api/auth/logout`    | JWT ungültig machen + OIDC-Logout URL |
| GET    | `/api/auth/me`        | Aktuellen Benutzer abrufen          |

### Transaktionen (🔒 JWT erforderlich)

| Method | Endpoint                  | Beschreibung                  |
|--------|---------------------------|-------------------------------|
| GET    | `/api/transactions`       | Liste (mit Filtern)           |
| POST   | `/api/transactions`       | Neue Transaktion              |
| PUT    | `/api/transactions/:id`   | Transaktion bearbeiten        |
| DELETE | `/api/transactions/:id`   | Transaktion löschen           |
| GET    | `/api/transactions/summary` | Monatsübersicht + Charts    |

**Filter-Parameter:**
- `month`, `year` – Monat/Jahr filtern
- `category_id` – Nach Kategorie filtern
- `type` – `income` oder `expense`
- `limit`, `offset` – Pagination

### Kategorien (🔒 JWT erforderlich)

| Method | Endpoint              | Beschreibung              |
|--------|-----------------------|---------------------------|
| GET    | `/api/categories`     | Alle Kategorien           |
| POST   | `/api/categories`     | Neue Kategorie            |
| PUT    | `/api/categories/:id` | Kategorie bearbeiten      |
| DELETE | `/api/categories/:id` | Kategorie löschen         |

---

## 🔒 Sicherheit

- **PKCE** (Proof Key for Code Exchange) für den OIDC-Flow
- **JWT** für API-Authentifizierung (Bearer Token)
- **Session** nur für den OIDC State/Nonce (kurzlebig, 10 Min.)
- **Helmet.js** für HTTP-Sicherheitsheader
- **Rate Limiting** auf allen API-Endpunkten (200 Req/15 Min)
- **Input-Validierung** mit Zod auf Backend-Seite
- **User-Isolation** – jede DB-Query filtert nach `user_id`
- Tokens werden nur im `localStorage` gespeichert (kein Cookie für API-Auth)

---

## 📊 Logging

Das Backend verwendet **Winston** für strukturiertes JSON-Logging:

```bash
# Logs in Echtzeit anzeigen
docker-compose logs -f backend

# Beispiel-Log
{"level":"info","message":"Server running on port 3001","env":"production","timestamp":"..."}
{"level":"info","message":"OIDC client initialized","timestamp":"..."}
{"level":"debug","message":"DB query executed","duration":3,"rows":5,"timestamp":"..."}
```

---

## 🐛 Troubleshooting

**Problem: OIDC-Discover schlägt fehl**
```
OIDC_ISSUER_URL prüfen – muss ohne trailing slash sein
Netzwerk-Konnektivität vom Backend zum Provider prüfen:
docker-compose exec backend wget -O- $OIDC_ISSUER_URL/.well-known/openid-configuration
```

**Problem: Callback kommt nicht an**
```
OIDC_REDIRECT_URI muss exakt mit dem konfigurierten Wert im OIDC-Provider übereinstimmen
Format: http(s)://domain/api/auth/callback
```

**Problem: Datenbankverbindung schlägt fehl**
```bash
docker-compose logs postgres
docker-compose exec postgres pg_isready -U haushalt -d haushaltsbuch
```

**Problem: Frontend zeigt "Unauthorized"**
```
Token im Browser-LocalStorage prüfen:
Browser DevTools → Application → Local Storage → auth_token
```

---

## 🔄 Updates & Migrations

Neue Datenbank-Migrationen in `database/migrations/` ablegen (z.B. `002_add_tags.sql`).
Sie werden beim nächsten Container-Start automatisch ausgeführt (PostgreSQL `docker-entrypoint-initdb.d` – nur bei frischer DB).

Für bestehende Datenbanken Migrationen manuell ausführen:
```bash
docker-compose exec postgres psql -U haushalt -d haushaltsbuch -f /docker-entrypoint-initdb.d/002_add_tags.sql
```

---

## 📝 Lizenz

MIT – Frei verwendbar und anpassbar.
