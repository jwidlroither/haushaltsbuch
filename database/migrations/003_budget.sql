-- Migration 003: Budget & Status

-- 1. Status-Spalte zu transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS status VARCHAR(20)
    CHECK (status IN ('bezahlt', 'ausstehend'))
    DEFAULT 'bezahlt';

-- Bestehende Transaktionen sind alle 'bezahlt'
UPDATE transactions SET status = 'bezahlt' WHERE status IS NULL;

-- Index für schnelle Abfragen nach Status
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- 2. Budgets-Tabelle (monatlich, global oder pro Kategorie)
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    -- NULL category_id = Gesamtbudget
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ein Budget pro User/Monat/Jahr/Kategorie
    UNIQUE(user_id, month, year, category_id)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, year, month);

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
