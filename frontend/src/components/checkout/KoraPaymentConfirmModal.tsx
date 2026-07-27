import { formatCurrency } from '../../utils/helpers';

type Props = {
  open: boolean;
  orderTotal: number;
  processingFee: number;
  chargeTotal: number;
  submitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function KoraPaymentConfirmModal({
  open,
  orderTotal,
  processingFee,
  chargeTotal,
  submitting = false,
  onConfirm,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kora-confirm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        disabled={submitting}
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light p-6 text-center shadow-2xl">
        <h2
          id="kora-confirm-title"
          className="font-display text-3xl font-extrabold tracking-tight text-white"
        >
          Attention!!!
        </h2>

        <p className="mt-5 text-sm leading-relaxed text-white/70">
          Please ensure you pay the exact amount shown, including all applicable charges.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          Paying less or more than the specified amount may result in delays or a failed
          transaction.
        </p>

        <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-brand-dark px-4 py-4 text-sm">
          <div className="flex justify-between gap-3 text-white/65">
            <span>Order total</span>
            <span>{formatCurrency(orderTotal)}</span>
          </div>
          <div className="flex justify-between gap-3 text-white/65">
            <span>Processing fee</span>
            <span>{formatCurrency(processingFee)}</span>
          </div>
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-base font-bold text-white">
            <span>You will pay now</span>
            <span className="text-brand-gold">{formatCurrency(chargeTotal)}</span>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-white">Thank you for your attention.</p>

        <button
          type="button"
          disabled={submitting}
          onClick={onConfirm}
          className="mt-6 w-full rounded-full bg-brand-gold py-3.5 font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-60"
        >
          {submitting ? 'Starting Kora…' : 'I Understand'}
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={onClose}
          className="mt-3 w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white/80 hover:border-brand-gold hover:text-brand-gold disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
