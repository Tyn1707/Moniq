import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * Toast notifications (brief §31).
 *
 * An in-memory queue plus a fixed region. The region is `aria-live` so successes
 * and failures are announced, not just shown — position and colour are not
 * accessible signals on their own.
 */

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

const VARIANTS: Record<ToastVariant, { accent: string; icon: ReactNode }> = {
  success: {
    accent: 'bg-income-500',
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-income-600" aria-hidden="true" />,
  },
  error: {
    accent: 'bg-expense-500',
    icon: <AlertCircle className="h-5 w-5 shrink-0 text-expense-600" aria-hidden="true" />,
  },
  info: {
    accent: 'bg-accent-500',
    icon: <Info className="h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />,
  },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      nextId.current += 1;
      const id = nextId.current;
      // Cap the stack: more than three at once is noise, and the oldest is the
      // least relevant.
      setToasts((current) => [...current.slice(-2), { id, variant, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Above the mobile bottom nav so it never covers navigation.
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col gap-2 sm:w-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full animate-toast-in items-stretch overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-float sm:w-[22rem]"
            >
              {/* Colour rail: carries the variant without tinting the whole card. */}
              <span className={clsx('w-1 shrink-0', VARIANTS[toast.variant].accent)} aria-hidden="true" />
              <div className="flex flex-1 items-start gap-3 px-3.5 py-3">
                {VARIANTS[toast.variant].icon}
                <p className="flex-1 pt-0.5 text-[0.8125rem] font-medium leading-snug text-ink-800">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 rounded-lg p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
};
