import { useRef, useState } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  /** Wisch nach links (→ Löschen). Erhält selbst die finale Bestätigung (z.B. window.confirm). */
  onDelete?: () => void;
  /** Wisch nach rechts (→ Als bezahlt markieren). */
  onMarkPaid?: () => void;
}

const THRESHOLD = 72;
const MAX_SWIPE = 96;

/**
 * Framework-freie Wisch-Geste (Pointer Events) für Listenzeilen: nach links
 * wischen löscht (mit Bestätigung durch den Aufrufer), nach rechts markiert
 * als bezahlt. Auf Desktop bleiben die vorhandenen Hover-Buttons zusätzlich nutzbar.
 */
export default function SwipeableRow({ children, onDelete, onMarkPaid }: SwipeableRowProps) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axisLocked = useRef<'x' | 'y' | null>(null);
  const pointerId = useRef<number | null>(null);

  if (!onDelete && !onMarkPaid) return <>{children}</>;

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    startY.current = e.clientY;
    axisLocked.current = null;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    if (!axisLocked.current) {
      if (Math.abs(deltaX) < 6 && Math.abs(deltaY) < 6) return;
      axisLocked.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
      if (axisLocked.current === 'x') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (axisLocked.current !== 'x') return;
    let next = deltaX;
    if (!onMarkPaid) next = Math.min(0, next);
    if (!onDelete) next = Math.max(0, next);
    setDx(Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, next)));
  };

  const finish = () => {
    if (dx <= -THRESHOLD && onDelete) onDelete();
    else if (dx >= THRESHOLD && onMarkPaid) onMarkPaid();
    setDx(0);
    setDragging(false);
    axisLocked.current = null;
    pointerId.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-sm)]">
      {/* Hintergrund-Aktion: Löschen (rechts, erscheint beim Links-Wischen) */}
      {onDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 text-white text-xs font-semibold"
          style={{ width: MAX_SWIPE, background: 'var(--danger)', opacity: dx < -8 ? Math.min(1, -dx / THRESHOLD) : 0 }}
        >
          Löschen
        </div>
      )}
      {/* Hintergrund-Aktion: Bezahlt (links, erscheint beim Rechts-Wischen) */}
      {onMarkPaid && (
        <div
          className="absolute inset-y-0 left-0 flex items-center pl-5 text-white text-xs font-semibold"
          style={{ width: MAX_SWIPE, background: 'var(--success)', opacity: dx > 8 ? Math.min(1, dx / THRESHOLD) : 0 }}
        >
          Bezahlt
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
          touchAction: 'pan-y',
        }}
        className="relative bg-[var(--surface)]"
      >
        {children}
      </div>
    </div>
  );
}
