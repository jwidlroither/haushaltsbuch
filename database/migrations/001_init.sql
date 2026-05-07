-- =============================================================
-- Haushaltsbuch - Datenbankschema
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Benutzer (via OIDC befüllt)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    oidc_subject VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kategorien
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📦',
    color VARCHAR(7) DEFAULT '#6366f1',
    type VARCHAR(10) CHECK (type IN ('income', 'expense', 'both')) DEFAULT 'both',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaktionen
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(500),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- System-Kategorien (user_id = NULL → werden beim ersten Login kopiert)
INSERT INTO categories (user_id, name, icon, color, type, is_system) VALUES
  (NULL, 'Lebensmittel',      '🛒', '#22c55e', 'expense', TRUE),
  (NULL, 'Miete',             '🏠', '#3b82f6', 'expense', TRUE),
  (NULL, 'Transport',         '🚗', '#f59e0b', 'expense', TRUE),
  (NULL, 'Gesundheit',        '💊', '#ef4444', 'expense', TRUE),
  (NULL, 'Freizeit',          '🎮', '#8b5cf6', 'expense', TRUE),
  (NULL, 'Restaurant',        '🍽️', '#f97316', 'expense', TRUE),
  (NULL, 'Kleidung',          '👗', '#ec4899', 'expense', TRUE),
  (NULL, 'Bildung',           '📚', '#06b6d4', 'expense', TRUE),
  (NULL, 'Versicherung',      '🛡️', '#64748b', 'expense', TRUE),
  (NULL, 'Haushalt',          '🏡', '#84cc16', 'expense', TRUE),
  (NULL, 'Elektronik',        '💻', '#0ea5e9', 'expense', TRUE),
  (NULL, 'Reisen',            '✈️', '#14b8a6', 'expense', TRUE),
  (NULL, 'Sport',             '🏋️', '#a855f7', 'expense', TRUE),
  (NULL, 'Sonstiges',         '📦', '#94a3b8', 'both',    TRUE),
  (NULL, 'Gehalt',            '💼', '#16a34a', 'income',  TRUE),
  (NULL, 'Freelance',         '💡', '#2563eb', 'income',  TRUE),
  (NULL, 'Kapitalerträge',    '📈', '#d97706', 'income',  TRUE),
  (NULL, 'Mieteinnahmen',     '🏘️', '#059669', 'income',  TRUE),
  (NULL, 'Geschenke erhalten','🎁', '#db2777', 'income',  TRUE),
  (NULL, 'Sonstige Einnahmen','💰', '#7c3aed', 'income',  TRUE)
ON CONFLICT DO NOTHING;
