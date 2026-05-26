-- Migration 007: Composite indexes for common query patterns

-- Transactions: month/year filter is the most common query (dashboard, transactions page)
CREATE INDEX IF NOT EXISTS idx_transactions_user_year_month
  ON transactions(user_id, EXTRACT(YEAR FROM date)::int, EXTRACT(MONTH FROM date)::int);

-- Transactions: status filter combined with user
CREATE INDEX IF NOT EXISTS idx_transactions_user_status
  ON transactions(user_id, status) WHERE status = 'ausstehend';

-- Recurring: active entries per user (materialize job)
CREATE INDEX IF NOT EXISTS idx_recurring_user_active_start
  ON recurring_transactions(user_id, start_date) WHERE is_active = TRUE;

-- Savings goals: ordering by completion status
CREATE INDEX IF NOT EXISTS idx_goals_user_completed
  ON savings_goals(user_id, is_completed, created_at DESC);
