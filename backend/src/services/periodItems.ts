import { query } from '../config/database';
import { resolvePeriod, nextPeriod, type Period } from '../utils/period';

export type SourceType = 'fixed' | 'debt' | 'subscription';

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
  sourceType: SourceType,
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

type SubscriptionInterval = 'monthly' | 'quarterly' | 'yearly' | 'irregular';

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** +1/+3/+12 Monate ab `date` (UTC, um die von pg als UTC-Mitternacht gelieferten
 *  DATE-Werte nicht durch die Serverzeitzone zu verschieben). */
function advanceDueDate(date: Date, interval: 'monthly' | 'quarterly' | 'yearly'): Date {
  const months = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : 12;
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/**
 * Übernimmt fällige Abos in den Zeitraum: monatliche immer, quartals-/jährliche nur
 * wenn ihr `next_due_date` in den Zeitraum fällt. 'irregular' (z.B. Wertkarten mit
 * unvorhersehbarem Timing) wird nie automatisch übernommen – siehe addPeriodPayment
 * für die manuelle Variante ("jetzt aufnehmen").
 *
 * Nach dem (erstmaligen) Anlegen des period_items für diesen Zeitraum wird
 * `next_due_date` weitergesetzt, damit künftige Zeiträume die nächste Fälligkeit
 * kennen – ohne diesen Schritt würde ein quartals-/jährliches Abo nie wieder
 * matchen, weil sein next_due_date für immer in der Vergangenheit bliebe.
 */
export async function materializeSubscriptions(userId: string, payday: number | null, period: Period): Promise<void> {
  const due = await query<{ id: string; amount: string; interval: SubscriptionInterval; next_due_date: string | null }>(
    `SELECT id, amount, interval, next_due_date FROM subscriptions
     WHERE user_id=$1 AND active=TRUE AND interval != 'irregular'
       AND (interval = 'monthly' OR (next_due_date IS NOT NULL AND next_due_date BETWEEN $2 AND $3))`,
    [userId, period.start, period.end]
  );

  for (const sub of due) {
    const inserted = await query<{ id: string }>(
      `INSERT INTO period_items (user_id, period_start, source_type, source_id, planned_amount)
       VALUES ($1,$2,'subscription',$3,$4)
       ON CONFLICT (user_id, period_start, source_type, source_id) DO NOTHING
       RETURNING id`,
      [userId, period.start, sub.id, sub.amount]
    );
    if (!inserted.length) continue; // für diesen Zeitraum schon materialisiert

    // 'irregular' ist durch das WHERE oben bereits ausgeschlossen, bleibt TS aber
    // über den SELECT-Typ als Möglichkeit erhalten.
    const nextDueDate = sub.interval === 'monthly'
      ? nextPeriod(payday, period).start // informativ: Beginn des nächsten Zeitraums
      : toDateString(advanceDueDate(new Date(`${sub.next_due_date}T00:00:00Z`), sub.interval as 'quarterly' | 'yearly'));
    await query('UPDATE subscriptions SET next_due_date=$2 WHERE id=$1', [sub.id, nextDueDate]);
  }
}
