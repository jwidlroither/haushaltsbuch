/**
 * Tests für die Zeitraum-Logik (Zahltag → Zahltag, Fallback Kalendermonat)
 */
import { resolvePeriod, previousPeriod, nextPeriod } from '../utils/period';

describe('resolvePeriod', () => {
  it('fällt ohne Zahltag auf den Kalendermonat zurück', () => {
    expect(resolvePeriod(null, new Date(2026, 10, 15))).toEqual({
      start: '2026-11-01', end: '2026-11-30',
    });
  });

  it('startet am Zahltag, wenn heute >= Zahltag ist', () => {
    expect(resolvePeriod(27, new Date(2026, 10, 27))).toEqual({
      start: '2026-11-27', end: '2026-12-26',
    });
  });

  it('gehört vor dem Zahltag noch zum Zeitraum des Vormonats', () => {
    expect(resolvePeriod(27, new Date(2026, 10, 5))).toEqual({
      start: '2026-10-27', end: '2026-11-26',
    });
  });

  it('klammert einen Zahltag > Tage im Monat auf den letzten Tag', () => {
    // April hat 30 Tage, Zahltag 31 → 30. April
    expect(resolvePeriod(31, new Date(2026, 3, 30))).toEqual({
      start: '2026-04-30', end: '2026-05-30',
    });
  });

  it('löst Jahresübergänge korrekt auf', () => {
    expect(resolvePeriod(27, new Date(2026, 11, 30))).toEqual({
      start: '2026-12-27', end: '2027-01-26',
    });
    expect(resolvePeriod(27, new Date(2027, 0, 5))).toEqual({
      start: '2026-12-27', end: '2027-01-26',
    });
  });

  it('previousPeriod/nextPeriod sind lückenlos und zueinander invers', () => {
    const current = resolvePeriod(27, new Date(2026, 10, 27));
    const prev = previousPeriod(27, current);
    const next = nextPeriod(27, current);
    expect(prev.end).toBe('2026-11-26'); // ein Tag vor current.start
    expect(next.start).toBe('2026-12-27'); // ein Tag nach current.end
    expect(nextPeriod(27, prev)).toEqual(current);
    expect(previousPeriod(27, next)).toEqual(current);
  });
});
