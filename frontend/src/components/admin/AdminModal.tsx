import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky action row (Cancel / Save). Keep form submit buttons here with `form="…"`. */
  footer?: ReactNode;
  /** Disables backdrop / X / Escape while saving */
  busy?: boolean;
  size?: 'md' | 'lg';
  /** Optional subtitle under the title */
  description?: string;
};

/**
 * Shared admin dialog — matches Slider Management:
 * mobile bottom sheet, desktop centered, sticky header/footer, scrollable body.
 */
export function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  busy = false,
  size = 'lg',
  description,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const close = () => {
    if (!busy) onClose();
  };

  // Keep outside theme remaps so the dialog stays dark (same as Menu / Categories).
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          /* Do not use flex-1 on the body with only max-h — it collapses content to 0 height. */
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-brand-dark-light text-white shadow-xl sm:rounded-2xl',
          size === 'md' ? 'max-w-md' : 'max-w-lg',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
            {description ? (
              <p className="mt-1.5 text-sm text-white/60">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-11rem)] overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
