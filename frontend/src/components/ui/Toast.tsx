import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '../../utils/helpers';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[10000] flex w-[min(92vw,22rem)] flex-col gap-2 sm:top-6 sm:right-6"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.kind === 'error'
              ? XCircle
              : toast.kind === 'info'
                ? Info
                : CheckCircle2;
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10',
                toast.kind === 'error' && 'bg-red-600',
                toast.kind === 'info' && 'bg-brand-dark-light',
                toast.kind === 'success' && 'bg-brand-green'
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
