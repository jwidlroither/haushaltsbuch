-- Migration 012: Abos (Streaming, Software, Wertkarten, ...)
--
-- Abos zählen zu den Fixkosten (source_type='subscription' in period_items,
-- ihre Summe fließt mit in den "Fixkosten"-Block der Übersicht ein), haben aber
-- ein eigenes Datenmodell, weil sie – anders als ein fixer Fixkosten-Betrag pro
-- Zeitraum – ein Intervall und ein konkretes nächstes Abbuchungsdatum brauchen.

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    interval VARCHAR(10) NOT NULL CHECK (interval IN ('monthly','quarterly','yearly','irregular')),
    -- Bei 'irregular' (z.B. Wertkarten mit unvorhersehbarem Timing) nur informativ;
    -- wird nie automatisch in einen Zeitraum übernommen.
    next_due_date DATE,
    category VARCHAR(20) NOT NULL DEFAULT 'Sonstige'
      CHECK (category IN ('Streaming','Software','Wertkarte','Sonstige')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- period_items.source_type um 'subscription' erweitern (bisher nur 'fixed'/'debt').
ALTER TABLE period_items DROP CONSTRAINT IF EXISTS period_items_source_type_check;
ALTER TABLE period_items ADD CONSTRAINT period_items_source_type_check
  CHECK (source_type IN ('fixed','debt','subscription'));
