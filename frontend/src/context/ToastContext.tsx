import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (msg: string, duration?: number) => void;
    error:   (msg: string, duration?: number) => void;
    warning: (msg: string, duration?: number) => void;
    info:    (msg: string, duration?: number) => void;
  };
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]); // max 5
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  // Referenziell stabil halten: andernfalls bekommt jeder Verbraucher bei JEDEM
  // Toast-Event (auch an anderer Stelle der App) ein neues `toast`-Objekt, was
  // jedes `useCallback(fn, [toast])` neu erzeugt und jeden darauf lauschenden
  // `useEffect` erneut auslöst – schlägt der dadurch neu gestartete Request
  // seinerseits fehl und ruft `toast.error(...)` auf, entsteht eine
  // Endlosschleife aus Fehler-Toast → neuer Request → Fehler-Toast → ...
  const toast = useMemo(() => ({
    success: (msg: string, d?: number) => add('success', msg, d),
    error:   (msg: string, d?: number) => add('error',   msg, d),
    warning: (msg: string, d?: number) => add('warning', msg, d),
    info:    (msg: string, d?: number) => add('info',    msg, d),
  }), [add]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
