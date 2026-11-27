-- Migration 010: Umbau von Buchungsliste zu Monats-Plan (Zeitraum = Zahltag bis Zahltag)
--
-- Neue Kernfrage der App: "Was habe ich in diesem Zeitraum noch frei?"
-- Fixkosten und Rückzahlungen werden nicht mehr automatisch als `transactions`
-- materialisiert (siehe recurring_transactions), sondern pro Zeitraum als
-- `period_items` abgehakt. `transactions` bleibt unverändert für Ausgaben/Einnahmen.

-- Fixkosten (z.B. Versicherung, Abos, Internet)
CREATE TABLE IF NOT EXISTS fixed_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_user ON fixed_costs(user_id);
CREATE TRIGGER trg_fixed_costs_updated_at BEFORE UPDATE ON fixed_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Rückzahlungen (privat, Inkasso, Ratenkauf/Klarna, sonstige)
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    creditor_type VARCHAR(20) NOT NULL CHECK (creditor_type IN ('privat','inkasso','ratenkauf','sonstige')),
    -- Rate pro Zeitraum; bei reinen Ratenkäufen (z.B. Klarna) oft unbekannt/leer,
    -- dann trägt der Nutzer pro Zeitraum selbst ein, was gezahlt wird.
    monthly_rate DECIMAL(12,2) CHECK (monthly_rate >= 0),
    -- Offener Gesamtbetrag; NULL = nicht bekannt/nicht getrackt.
    remaining_amount DECIMAL(12,2) CHECK (remaining_amount >= 0),
    due_day SMALLINT CHECK (due_day BETWEEN 1 AND 31),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
CREATE TRIGGER trg_debts_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Pro Zeitraum erzeugte Einträge aus Fixkosten/Rückzahlungen ("Vorlage" → konkrete
-- Buchung für genau diesen Zeitraum, überschreibbar ohne die Vorlage zu ändern).
-- source_id verweist je nach source_type auf fixed_costs.id oder debts.id
-- (kein DB-FK möglich, da zwei Quelltabellen – Löschungen kaskadieren im Code).
CREATE TABLE IF NOT EXISTS period_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('fixed','debt')),
    source_id UUID NOT NULL,
    planned_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    paid_amount DECIMAL(12,2) CHECK (paid_amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, period_start, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_period_items_user_period ON period_items(user_id, period_start);
CREATE TRIGGER trg_period_items_updated_at BEFORE UPDATE ON period_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
