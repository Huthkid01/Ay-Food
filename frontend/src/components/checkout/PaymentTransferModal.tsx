import { useEffect, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export type BankPaymentDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
};

type Props = {
  open: boolean;
  amount: number;
  orderNumber: string;
  bank: BankPaymentDetails;
  /** Create order + alert admin. May be async. */
  onConfirmPaid: () => void | Promise<void>;
  /** After tracking is shown, open WhatsApp with order details. */
  onContinueWhatsApp: () => void;
  /** Dismiss modal — pay step cancels before placing; tracking step closes after order is placed. */
  onClose?: () => void;
  /** When true, show tracking step (order already placed). */
  confirmed?: boolean;
  /** Kora return: thank-you copy + WhatsApp / track actions (no bank UI). */
  variant?: 'transfer' | 'kora';
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-brand-dark px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-white/50">{label}</p>
        <p className="mt-0.5 break-all font-semibold text-white">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="shrink-0 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-brand-gold"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check size={16} className="text-brand-green" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export function PaymentTransferModal({
  open,
  amount,
  orderNumber,
  bank,
  onConfirmPaid,
  onContinueWhatsApp,
  onClose,
  confirmed = false,
  variant = 'transfer',
}: Props) {
  const isKora = variant === 'kora';
  const [step, setStep] = useState<'pay' | 'tracking'>(
    confirmed || isKora ? 'tracking' : 'pay',
  );
  const [copiedTrack, setCopiedTrack] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(confirmed || isKora ? 'tracking' : 'pay');
    setConfirming(false);
  }, [open, orderNumber, confirmed, isKora]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose && !confirming) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, confirming]);

  if (!open) return null;

  const canDismiss = Boolean(onClose) && !confirming;
  const canCancelPay = step === 'pay' && canDismiss;

  async function copyTracking() {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedTrack(true);
      window.setTimeout(() => setCopiedTrack(false), 1600);
    } catch {
      // ignore
    }
  }

  async function handleConfirm() {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirmPaid();
      setStep('tracking');
    } catch {
      setConfirming(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label={canDismiss ? 'Close' : undefined}
        disabled={!canDismiss}
        onClick={() => {
          if (canDismiss) onClose?.();
        }}
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="payment-modal-title" className="font-display text-xl font-bold text-white">
              {step === 'pay'
                ? 'Make payment'
                : isKora
                  ? 'Thank you for your order'
                  : 'Payment confirmed'}
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {step === 'pay'
                ? 'Transfer the exact amount, then confirm below. Close to keep editing your order.'
                : isKora
                  ? 'You can track your order anytime — or contact us on WhatsApp with your order summary.'
                  : 'Save your tracking number to follow your order.'}
            </p>
          </div>
          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label={step === 'pay' ? 'Cancel and edit order' : 'Close'}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {step === 'pay' ? (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl bg-brand-gold/15 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-brand-gold/80">Amount to pay</p>
              <p className="mt-1 font-display text-3xl font-bold text-brand-gold">
                {formatCurrency(amount)}
              </p>
            </div>

            <div className="space-y-2">
              <CopyRow label="Order number" value={orderNumber} />
              <CopyRow label="Bank name" value={bank.bankName} />
              <CopyRow label="Account name" value={bank.accountName} />
              <CopyRow label="Account number" value={bank.accountNumber} />
            </div>

            <p className="text-center text-xs text-white/45">
              Copy your order number and use it as the transfer narration if possible. Your order is
              only placed after you tap “I have made payment”.
            </p>

            <button
              type="button"
              disabled={confirming}
              onClick={() => void handleConfirm()}
              className="w-full rounded-full bg-brand-gold py-3.5 font-semibold text-white hover:bg-brand-gold-dark disabled:opacity-60"
            >
              {confirming ? 'Placing order…' : 'I have made payment'}
            </button>

            {canCancelPay && (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white/80 hover:border-brand-gold hover:text-brand-gold"
              >
                Cancel — edit my order
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {isKora && (
              <div className="rounded-xl bg-brand-gold/15 px-4 py-3 text-center">
                <p className="text-xs uppercase tracking-wide text-brand-gold/80">Amount paid</p>
                <p className="mt-1 font-display text-2xl font-bold text-brand-gold">
                  {formatCurrency(amount)}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-brand-green/30 bg-brand-green/10 px-4 py-4 text-center">
              <p className="text-xs uppercase tracking-wide text-brand-green/90">
                Your tracking number
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-white">
                {orderNumber}
              </p>
              <button
                type="button"
                onClick={() => void copyTracking()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                {copiedTrack ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                {copiedTrack ? 'Copied' : 'Copy number'}
              </button>
            </div>

            <p className="text-center text-sm text-white/65">
              {isKora
                ? 'Thank you for your order. You can track it anytime from Track Order. You can also contact us on WhatsApp — we’ll open a chat with your order summary.'
                : 'Save your tracking number. You can track your order anytime from Track Order in the menu. Next, send your order on WhatsApp so we can confirm your payment.'}
            </p>

            <button
              type="button"
              onClick={onContinueWhatsApp}
              className="w-full rounded-full bg-brand-gold py-3.5 font-semibold text-white hover:bg-brand-gold-dark"
            >
              {isKora ? 'Contact us on WhatsApp' : 'Continue to WhatsApp'}
            </button>

            {canDismiss && (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-white/20 py-3 text-sm font-semibold text-white/80 hover:border-brand-gold hover:text-brand-gold"
              >
                {isKora ? 'Track my order' : 'Skip WhatsApp — track my order'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
