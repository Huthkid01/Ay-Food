import { AdminModal } from './AdminModal';

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
  const confirmClass =
    tone === 'danger'
      ? 'rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50'
      : 'rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-50';

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      busy={loading}
      size="md"
      footer={
        <>
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
        </>
      }
    >
      <p className="text-sm leading-relaxed text-white/60">{message}</p>
    </AdminModal>
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
