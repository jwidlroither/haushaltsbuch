# ⬆️ Upgrade-Anleitung

## v1.0 → v1.1 (Budgetplanung)

```bash
# 1. DB-Migration
docker-compose exec postgres psql -U haushalt -d haushaltsbuch -c "
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20)
  CHECK (status IN ('bezahlt', 'ausstehend')) DEFAULT 'bezahlt';
UPDATE transactions SET status = 'bezahlt' WHERE status IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE TABLE IF NOT EXISTS oidc_states (
  id VARCHAR(64) PRIMARY KEY, state VARCHAR(255) NOT NULL,
  nonce VARCHAR(255) NOT NULL, code_verifier VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year, category_id)
);"

# 2. SESSION_SECRET aus .env entfernen (nicht mehr benötigt)
# 3. Rebuild
docker-compose up -d --build
```

## v1.1 → v1.2 (Bugfixes & Stabilität)

```bash
# 1. Budget NULL-Fix
docker-compose exec postgres psql -U haushalt -d haushaltsbuch -c "
DELETE FROM budgets a USING budgets b
WHERE a.id > b.id AND a.user_id = b.user_id
  AND a.month = b.month AND a.year = b.year
  AND a.category_id IS NULL AND b.category_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_total_unique
  ON budgets(user_id, month, year) WHERE category_id IS NULL;"

# 2. Optional: LOG_LEVEL=debug in .env für Debugging
# 3. Rebuild
docker-compose up -d --build
```
