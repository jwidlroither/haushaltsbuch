-- Migration 011: bestehende monatliche, aktive "wiederkehrende Ausgaben" als
-- Fixkosten übernehmen (Umbau-Spec: "bisherige recurring transactions hier
-- zusammenführen"). Jährliche/vierteljährliche/wöchentliche und
-- Einnahmen-Recurring passen nicht ins Fixkosten-Modell (ein fester Betrag
-- pro Zeitraum) und bleiben unangetastet unter "Wiederkehrend" verwaltbar.
--
-- Idempotent: läuft nur für Namen, die noch nicht als fixed_costs existieren,
-- kann also gefahrlos mehrfach ausgeführt werden (z.B. bei erneutem Einspielen).

INSERT INTO fixed_costs (user_id, name, amount, due_day, active)
SELECT rt.user_id, rt.description, rt.amount, rt.day_of_month, TRUE
FROM recurring_transactions rt
WHERE rt.type = 'expense'
  AND rt.interval = 'monthly'
  AND rt.is_active = TRUE
  AND rt.description IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM fixed_costs fc WHERE fc.user_id = rt.user_id AND fc.name = rt.description
  );

-- Deaktivieren, damit sie nicht länger zusätzlich als `transactions` materialisiert
-- werden (sonst würden sie doppelt gezählt: einmal als Fixkosten-period_item,
-- einmal als eigene ausstehende Ausgabe).
UPDATE recurring_transactions rt SET is_active = FALSE
WHERE rt.type = 'expense' AND rt.interval = 'monthly' AND rt.is_active = TRUE
  AND EXISTS (
    SELECT 1 FROM fixed_costs fc WHERE fc.user_id = rt.user_id AND fc.name = rt.description
  );
