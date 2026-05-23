-- Migration 002: OIDC State Store
-- Manuell ausführen bei bestehender Datenbank:
-- docker-compose exec postgres psql -U haushalt -d haushaltsbuch -f /docker-entrypoint-initdb.d/002_oidc_states.sql

CREATE TABLE IF NOT EXISTS oidc_states (
    id VARCHAR(64) PRIMARY KEY,
    state VARCHAR(255) NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oidc_states_created_at ON oidc_states(created_at);
