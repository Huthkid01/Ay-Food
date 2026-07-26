import {
  createContext,
  useCallback,
  useContext,
  useRef,
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
  const [toast, setToast] = useState<ToastItem | null>(null);
  const hideTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    const id = ++toastId;
    // Replace instantly — never stack
    setToast({ id, message, kind });

    hideTimer.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
      hideTimer.current = null;
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[10000] w-[min(92vw,22rem)] sm:top-6 sm:right-6"
        aria-live="polite"
      >
        {toast ? (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10',
              toast.kind === 'error' && 'bg-red-600',
              toast.kind === 'info' && 'bg-brand-dark-light',
              toast.kind === 'success' && 'bg-brand-green',
            )}
          >
            {toast.kind === 'error' ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : toast.kind === 'info' ? (
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
