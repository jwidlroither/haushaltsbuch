-- Migration 009: Zahltag pro Benutzer serverseitig speichern
-- (ersetzt `hb_payday` in localStorage – wird für Web + iOS gemeinsam genutzt)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS payday SMALLINT CHECK (payday BETWEEN 1 AND 31);
