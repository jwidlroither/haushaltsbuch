-- Optionales Seed-Script: Startdaten aus dem Excel-Export für den Umbau auf den
-- Monats-Plan. KEINE Migration – läuft nicht automatisch, sondern manuell:
--
--   docker compose exec postgres psql -U haushalt -d haushaltsbuch -f /docker-entrypoint-initdb.d/../seed-umbau-startdaten.sql
--
-- (oder den Inhalt direkt per `psql ... -c "$(cat database/seed-umbau-startdaten.sql)"`
--  einspielen). Setzt Migration 010 voraus. Verändert nur Daten des Nutzers
-- mit dieser E-Mail-Adresse – idempotent dank der NOT EXISTS-Checks, kann also
-- gefahrlos mehrfach laufen, ohne Duplikate anzulegen.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'jw@tumpenhasi.at';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kein Nutzer mit dieser E-Mail gefunden – Seed abgebrochen.';
  END IF;

  -- ── Fixkosten ──────────────────────────────────────────────────
  INSERT INTO fixed_costs (user_id, name, amount, note)
  SELECT v_user_id, x.name, x.amount, x.note FROM (VALUES
    ('Auto Versicherung', 50.00,  NULL),
    ('Abos',              94.32, NULL),
    ('A1 Internet',      100.96, 'Aktuell 50 € offen laut Excel')
  ) AS x(name, amount, note)
  WHERE NOT EXISTS (
    SELECT 1 FROM fixed_costs WHERE user_id = v_user_id AND name = x.name
  );

  -- ── Rückzahlungen privat (Betrag pro Zeitraum, Restschuld unbekannt) ──
  INSERT INTO debts (user_id, name, creditor_type, monthly_rate)
  SELECT v_user_id, x.name, 'privat', x.rate FROM (VALUES
    ('Mama',                 150.00),
    ('Reinhold – Galaxy',    100.00),
    ('Marie',                100.00),
    ('Desy Sparbuch',        100.00),
    ('Alex – Raten',          25.00),
    ('Arthur',                15.00),
    ('Desy Rückzahlungen',   260.00),
    ('Jana',                 100.00),
    ('Infomaniak',             6.00)
  ) AS x(name, rate)
  WHERE NOT EXISTS (
    SELECT 1 FROM debts WHERE user_id = v_user_id AND name = x.name
  );

  -- ── Inkasso (Rate + bekannter Restbetrag) ──────────────────────
  INSERT INTO debts (user_id, name, creditor_type, monthly_rate, remaining_amount)
  SELECT v_user_id, x.name, 'inkasso', x.rate, x.remaining FROM (VALUES
    ('Coeo Inkasso 1', 60.65, 253.58),
    ('Coeo Inkasso 2', 91.97, 460.05),
    ('Coeo Inkasso 3', 49.83, 348.85)
  ) AS x(name, rate, remaining)
  WHERE NOT EXISTS (
    SELECT 1 FROM debts WHERE user_id = v_user_id AND name = x.name
  );

  -- ── Klarna/Ratenkauf (nur offener Betrag, keine feste Rate) ────
  INSERT INTO debts (user_id, name, creditor_type, remaining_amount)
  SELECT v_user_id, x.name, 'ratenkauf', x.remaining FROM (VALUES
    ('Klarna – Rode',  395.28),
    ('Klarna – Bambu', 191.02)
  ) AS x(name, remaining)
  WHERE NOT EXISTS (
    SELECT 1 FROM debts WHERE user_id = v_user_id AND name = x.name
  );

  -- ── Bereits ausgegeben (aktueller Zeitraum) ────────────────────
  -- Kein Datum im Excel angegeben → auf heute gesetzt; Datum danach in der
  -- App bei Bedarf pro Buchung anpassen.
  INSERT INTO transactions (user_id, category_id, type, amount, description, date, status)
  SELECT v_user_id,
         (SELECT id FROM categories WHERE user_id = v_user_id AND name = x.category),
         'expense', x.amount, x.description, CURRENT_DATE, 'bezahlt'
  FROM (VALUES
    ('MediaMarkt Controller', 20.00,  'Elektronik'),
    ('dm Europark',           86.30,  'Haushalt'),
    ('Interspar',            143.71,  'Lebensmittel'),
    ('Avanti Tanken',         80.00,  'Transport'),
    ('Billa',                 13.90,  'Lebensmittel'),
    ('Kontoführung/Zinsen',   69.19,  'Sonstiges'),
    ('Steam Phasmophobia',    19.00,  'Freizeit'),
    ('Krone Essen',           25.90,  'Restaurant'),
    ('Jet Tanken',            31.47,  'Transport'),
    ('McDonalds',             34.60,  'Restaurant')
  ) AS x(description, amount, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = v_user_id AND description = x.description AND amount = x.amount
  );

  RAISE NOTICE 'Seed abgeschlossen für Nutzer %', v_user_id;
END $$;

-- Einkommen/Zahltag bewusst NICHT geseedet (im Dokument als "hier eintragen"
-- offengelassen) – einfach als normale Einnahme-Transaktion erfassen bzw.
-- den Zahltag unter /einstellungen setzen, falls noch nicht geschehen.
