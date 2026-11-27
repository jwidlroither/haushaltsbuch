/**
 * Zeitraum-Logik: ein "Zeitraum" läuft vom Zahltag bis zum Tag vor dem nächsten
 * Zahltag (z.B. Payday 27 → 27. Nov bis 26. Dez). Ohne gesetzten Zahltag wird
 * auf den Kalendermonat zurückgefallen, damit die App auch ohne diese Einstellung
 * benutzbar bleibt.
 *
 * Ein Zeitraum wird eindeutig über sein Startdatum (period_start) identifiziert.
 */

function daysInMonth(year: number, month: number): number {
  // month ist 1-basiert; Tag 0 des Folgemonats = letzter Tag von `month`
  return new Date(year, month, 0).getDate();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

/** Addiert `delta` Monate zu year/month (1-basiert), normalisiert Jahresüberlauf. */
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = (month - 1) + delta;
  const y = year + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12 + 1;
  return { year: y, month: m };
}

export interface Period {
  /** Startdatum des Zeitraums, YYYY-MM-DD – eindeutiger Schlüssel. */
  start: string;
  /** Letzter Tag des Zeitraums (inklusive), YYYY-MM-DD. */
  end: string;
}

/**
 * Ermittelt den Zeitraum, in den `referenceDate` fällt.
 * @param payday Zahltag (1-31) oder null (→ Kalendermonat).
 */
export function resolvePeriod(payday: number | null, referenceDate: Date): Period {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  if (payday === null) {
    const start = toDateString(refYear, refMonth, 1);
    const end = toDateString(refYear, refMonth, daysInMonth(refYear, refMonth));
    return { start, end };
  }

  const paydayThisMonth = clampDay(refYear, refMonth, payday);

  if (refDay >= paydayThisMonth) {
    // Zeitraum hat diesen Monat begonnen, endet kurz vor dem Zahltag nächsten Monat.
    const next = addMonths(refYear, refMonth, 1);
    const paydayNextMonth = clampDay(next.year, next.month, payday);
    const endDate = new Date(next.year, next.month - 1, paydayNextMonth);
    endDate.setDate(endDate.getDate() - 1);
    return {
      start: toDateString(refYear, refMonth, paydayThisMonth),
      end: toDateString(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()),
    };
  }

  // Noch vor dem Zahltag diesen Monat → Zeitraum hat letzten Monat begonnen.
  const prev = addMonths(refYear, refMonth, -1);
  const paydayPrevMonth = clampDay(prev.year, prev.month, payday);
  const endDate = new Date(refYear, refMonth - 1, paydayThisMonth);
  endDate.setDate(endDate.getDate() - 1);
  return {
    start: toDateString(prev.year, prev.month, paydayPrevMonth),
    end: toDateString(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()),
  };
}

/** Zeitraum, der direkt vor `period` liegt (für die Verlaufs-Seite). */
export function previousPeriod(payday: number | null, period: Period): Period {
  const start = new Date(period.start);
  start.setDate(start.getDate() - 1);
  return resolvePeriod(payday, start);
}

/** Zeitraum, der direkt nach `period` liegt. */
export function nextPeriod(payday: number | null, period: Period): Period {
  const end = new Date(period.end);
  end.setDate(end.getDate() + 1);
  return resolvePeriod(payday, end);
}
