import { X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** danger = red destructive; default = gold primary */
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

/** Styled confirm dialog — never use window.confirm / alert. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? 'rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50'
      : 'rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        onClick={loading ? undefined : onClose}
        aria-label="Close confirmation"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark-light text-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-white/60">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-3 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={confirmClass}>
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Prefer ConfirmModal — kept for existing admin delete flows */
export function DeleteConfirmModal(props: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmModal
      open={props.open}
      title={props.title ?? 'Delete item'}
      message={props.message}
      confirmLabel={props.confirmLabel ?? 'Yes, delete'}
      loading={props.loading}
      tone="danger"
      onConfirm={props.onConfirm}
      onClose={props.onClose}
    />
  );
}
