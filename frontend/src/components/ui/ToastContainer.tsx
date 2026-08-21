import { useToast, type Toast, type ToastType } from '../../context/ToastContext';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
  error:   'border-red-400    bg-red-50    dark:bg-red-900/30    text-red-800    dark:text-red-200',
  warning: 'border-amber-400  bg-amber-50  dark:bg-amber-900/30  text-amber-800  dark:text-amber-200',
  info:    'border-blue-400   bg-blue-50   dark:bg-blue-900/30   text-blue-800   dark:text-blue-200',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-400 text-white',
  error:   'bg-red-400    text-white',
  warning: 'bg-amber-400  text-white',
  info:    'bg-blue-400   text-white',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className={`
      flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)] border shadow-card
      min-w-64 max-w-sm w-full animate-slide-in
      ${STYLES[toast.type]}
    `}>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center
        text-xs font-bold shrink-0 mt-0.5 ${ICON_STYLES[toast.type]}`}>
        {ICONS[toast.type]}
      </span>
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none shrink-0"
      >×</button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
