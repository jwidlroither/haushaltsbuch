-- Migration 004: Budget NULL-Constraint Fix
--
-- PostgreSQL behandelt NULL != NULL, daher erlaubt der UNIQUE-Constraint
-- (user_id, month, year, category_id) mehrere Zeilen mit category_id = NULL.
-- Fix: Partieller Unique-Index für Gesamtbudget (category_id IS NULL).
--
-- Auf bestehender DB ausführen:
-- docker-compose exec postgres psql -U haushalt -d haushaltsbuch -f /docker-entrypoint-initdb.d/004_budget_fixes.sql

-- Erst duplikate bereinigen (falls welche entstanden sind)
DELETE FROM budgets a USING budgets b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.month = b.month
  AND a.year = b.year
  AND a.category_id IS NULL
  AND b.category_id IS NULL;

-- Partieller Index für Gesamtbudget (category_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_total_unique
  ON budgets(user_id, month, year)
  WHERE category_id IS NULL;

-- Partieller Index für Kategorie-Budgets (category_id IS NOT NULL)
-- Der bestehende UNIQUE-Constraint greift hier korrekt, aber explizit zur Sicherheit:
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_category_unique
  ON budgets(user_id, month, year, category_id)
  WHERE category_id IS NOT NULL;
