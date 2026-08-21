import { formatMonth } from '../../utils/format';

interface MonthSelectorProps {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  disableNext?: boolean;
  direction?: 'left' | 'right' | null;
  loading?: boolean;
}

export default function MonthSelector({
  month, year, onPrev, onNext, disableNext = false, direction, loading
}: MonthSelectorProps) {
  const animClass = direction === 'right'
    ? 'slide-in-right'
    : direction === 'left'
    ? 'slide-in-left'
    : '';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        aria-label="Vorheriger Monat"
        className="w-8 h-8 flex items-center justify-center rounded-lg
          text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)]
          active:scale-90 transition-all duration-150"
      >
        ←
      </button>

      <div className="min-w-[160px] text-center overflow-hidden">
        <span
          key={`${year}-${month}`}
          className={`block font-medium text-[var(--ink)] ${animClass}`}
        >
          {formatMonth(month, year)}
        </span>
      </div>

      <button
        onClick={onNext}
        disabled={disableNext}
        aria-label="Nächster Monat"
        className="w-8 h-8 flex items-center justify-center rounded-lg
          text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)]
          active:scale-90 transition-all duration-150
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        →
      </button>

      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-[var(--accent)] border-t-transparent
          rounded-full animate-spin" aria-label="Laden…" />
      )}
    </div>
  );
}
