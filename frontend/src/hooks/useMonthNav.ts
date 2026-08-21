import { useState, useCallback } from 'react';
import { currentMonth } from '../utils/format';

interface MonthYear { month: number; year: number; }
type Direction = 'left' | 'right' | null;

export function useMonthNav(initial?: MonthYear) {
  const [monthYear, setMonthYear] = useState<MonthYear>(initial ?? currentMonth());
  const [direction, setDirection] = useState<Direction>(null);

  const shiftMonth = useCallback((delta: number) => {
    setDirection(delta > 0 ? 'right' : 'left');
    setMonthYear(prev => {
      let m = prev.month + delta, y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1)  { m = 12; y--; }
      return { month: m, year: y };
    });
    setTimeout(() => setDirection(null), 300);
  }, []);

  const isCurrentMonth = (
    monthYear.month === currentMonth().month &&
    monthYear.year  === currentMonth().year
  );

  return { monthYear, shiftMonth, direction, isCurrentMonth };
}
