import { query } from '../config/database';
import { resolvePeriod, type Period } from '../utils/period';

/** Lädt den Zahltag des Nutzers (für resolvePeriod – null = Kalendermonat-Fallback). */
export async function getUserPayday(userId: string): Promise<number | null> {
  const rows = await query<{ payday: number | null }>('SELECT payday FROM users WHERE id=$1', [userId]);
  return rows[0]?.payday ?? null;
}

export async function resolveCurrentPeriod(userId: string, referenceDate: Date = new Date()): Promise<Period> {
  const payday = await getUserPayday(userId);
  return resolvePeriod(payday, referenceDate);
}

/**
 * Reduziert (oder bei negativem Delta: erhöht) den Restbetrag einer Rückzahlung.
 * Bleibt bewusst konservativ: archiviert nur bei Erreichen von 0, reaktiviert nie
 * automatisch (ein manuell pausierter/archivierter Eintrag bleibt es).
 */
export async function adjustDebtRemaining(userId: string, debtId: string, delta: number): Promise<void> {
  const rows = await query<{ remaining_amount: string | null }>(
    'SELECT remaining_amount FROM debts WHERE id=$1 AND user_id=$2', [debtId, userId]
  );
  if (!rows.length || rows[0].remaining_amount === null) return; // kein Restbetrag getrackt
  const newRemaining = Math.max(0, parseFloat(rows[0].remaining_amount) - delta);
  await query('UPDATE debts SET remaining_amount=$2 WHERE id=$1', [debtId, newRemaining]);
  if (newRemaining <= 0) {
    await query('UPDATE debts SET active=FALSE WHERE id=$1', [debtId]);
  }
}

/**
 * Trägt einen gezahlten Betrag für eine Fixkosten-/Rückzahlungs-Quelle in den
 * aktuellen Zeitraum ein (addiert auf einen eventuell schon vorhandenen Eintrag,
 * statt ihn zu überschreiben – wichtig für Sonderzahlungen zusätzlich zur
 * regulären Rate im selben Zeitraum). So bleibt `period_items` die einzige
 * Quelle der Wahrheit für "wie viel wurde insgesamt schon gezahlt".
 */
export async function addPeriodPayment(
  userId: string,
  sourceType: 'fixed' | 'debt',
  sourceId: string,
  amount: number,
  defaultPlannedAmount: number,
  period: Period
): Promise<void> {
  const existing = await query<{ id: string; planned_amount: string; paid_amount: string | null }>(
    `SELECT id, planned_amount, paid_amount FROM period_items
     WHERE user_id=$1 AND period_start=$2 AND source_type=$3 AND source_id=$4`,
    [userId, period.start, sourceType, sourceId]
  );
  if (existing.length) {
    const newPaidAmount = (existing[0].paid_amount !== null ? parseFloat(existing[0].paid_amount) : 0) + amount;
    const newPlanned = Math.max(parseFloat(existing[0].planned_amount), newPaidAmount);
    await query(
      `UPDATE period_items SET paid=TRUE, paid_at=NOW(), paid_amount=$2, planned_amount=$3 WHERE id=$1`,
      [existing[0].id, newPaidAmount, newPlanned]
    );
  } else {
    await query(
      `INSERT INTO period_items (user_id, period_start, source_type, source_id, planned_amount, paid, paid_at, paid_amount)
       VALUES ($1,$2,$3,$4,$5,TRUE,NOW(),$6)`,
      [userId, period.start, sourceType, sourceId, Math.max(defaultPlannedAmount, amount), amount]
    );
  }
}
