import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useSiteContentData } from '../hooks/useSiteContent';
import { formatCurrency } from '../utils/helpers';
import { openOrderOnWhatsApp, type WhatsAppOrderDetails } from '../utils/whatsapp-order';
import { getKoraChargeNgn, getKoraProcessingFeeNgn } from '../utils/kora-fees';
import { PaymentTransferModal } from '../components/checkout/PaymentTransferModal';
import { KoraPaymentConfirmModal } from '../components/checkout/KoraPaymentConfirmModal';
import { useToast } from '../components/ui/Toast';
import {
  DEFAULT_DELIVERY_FEE,
  siteSettingsService,
} from '../services/site-settings.service';
import {
  geolocationErrorMessage,
  getGeolocationPermission,
  locationBlockedHelp,
  resolveDeliveryAddressFromGps,
} from '../utils/delivery-location';
import {
  clearPendingKoraCheckout,
  createOrderAwaitingKora,
  readPendingKoraCheckout,
  savePendingKoraCheckout,
  startKoraCheckout,
  verifyKoraPayment,
} from '../services/kora-payment.service';
import { notifyAdminKoraPaid } from '../services/payment-notify.service';

const checkoutSchema = z
  .object({
    customerName: z.string().min(2, 'Name is required'),
    customerPhone: z.string().min(10, 'Valid phone required'),
    customerEmail: z.string().email('Valid email required'),
    orderType: z.enum(['DELIVERY', 'PICKUP']),
    deliveryAddress: z.string().optional(),
    deliveryInstructions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === 'DELIVERY' && !data.deliveryAddress?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery address is required',
        path: ['deliveryAddress'],
      });
    }
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;

type CompletedOrder = {
  orderNumber: string;
  total: number;
  whatsapp: WhatsAppOrderDetails;
};

function nextOrderNumber() {
  return `AY-${Date.now().toString().slice(-8)}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getFlattenedItems, subtotal, packFees, activePacks, clearCart } = useCart();
  const { restaurant } = useSiteContentData();
  const { showToast } = useToast();
  const items = getFlattenedItems();
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsService.get(),
    staleTime: 60_000,
  });
  const configuredDeliveryFee = Math.max(
    0,
    Math.round(Number(siteSettings?.delivery_fee ?? DEFAULT_DELIVERY_FEE)),
  );
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<CheckoutForm | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const itemsTotal = subtotal + packFees;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: 'DELIVERY',
    },
  });

  const orderType = watch('orderType');
  const deliveryFee =
    orderType === 'DELIVERY' && activePacks.length > 0 ? configuredDeliveryFee : 0;
  const orderTotal = itemsTotal + deliveryFee;
  const processingFee = getKoraProcessingFeeNgn(orderTotal);
  const chargeTotal = getKoraChargeNgn(orderTotal);

  useEffect(() => {
    const kora = searchParams.get('kora');
    const reference =
      searchParams.get('reference')?.trim() ||
      readPendingKoraCheckout()?.reference ||
      '';

    if (kora !== 'return' || !reference || completed) return;

    let cancelled = false;
    setVerifying(true);

    void (async () => {
      try {
        const result = await verifyKoraPayment(reference);
        if (cancelled) return;

        if (!result.paid) {
          showToast(result.message || result.error || 'Payment not completed yet', 'error');
          return;
        }

        const whatsapp: WhatsAppOrderDetails = {
          orderNumber: result.orderNumber,
          customerName: result.customerName,
          customerPhone: result.customerPhone,
          customerEmail: result.customerEmail,
          orderType: result.orderType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
          deliveryAddress: result.deliveryAddress ?? undefined,
          deliveryInstructions: result.deliveryInstructions ?? undefined,
          items: (result.items ?? []).map((i) => ({
            foodName: i.food_name || 'Item',
            portionName: i.portion_name || 'Standard',
            quantity: i.quantity ?? 1,
            unitPrice: i.unit_price ?? 0,
            packName: i.pack_name ?? undefined,
          })),
          total: result.total,
          paid: true,
          paymentProvider: 'Kora',
        };

        // FormSubmit works reliably from the browser (not from Edge Functions).
        void notifyAdminKoraPaid(whatsapp).catch(() => undefined);

        clearCart();
        clearPendingKoraCheckout();
        setCompleted({
          orderNumber: result.orderNumber,
          total: result.total,
          whatsapp,
        });
        setSearchParams({}, { replace: true });
        showToast('Thank you for your order — you can track it anytime');
      } catch (err) {
        if (!cancelled) {
          showToast(
            err instanceof Error ? err.message : 'Could not verify payment',
            'error',
          );
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, completed, clearCart, setSearchParams, showToast]);

  async function handleUseCurrentLocation() {
    setLocating(true);
    setLocationBlocked(false);
    try {
      const permission = await getGeolocationPermission();
      if (permission === 'denied') {
        setLocationBlocked(true);
        showToast(locationBlockedHelp(), 'error');
        return;
      }

      const { address, mapsUrl: pinUrl } = await resolveDeliveryAddressFromGps();
      setValue('deliveryAddress', address, { shouldValidate: true });
      setMapsUrl(pinUrl);
      showToast('Location filled — you can edit the address if needed');
    } catch (err) {
      const denied =
        err && typeof err === 'object' && 'code' in err && (err as GeolocationPositionError).code === 1;
      if (denied) setLocationBlocked(true);
      showToast(geolocationErrorMessage(err), 'error');
    } finally {
      setLocating(false);
    }
  }

  const payWithKora = useMutation({
    mutationFn: async (form: CheckoutForm) => {
      const draftDelivery =
        form.orderType === 'DELIVERY' && activePacks.length > 0 ? configuredDeliveryFee : 0;
      const draftTotal = subtotal + packFees + draftDelivery;
      const orderNumber = nextOrderNumber();

      await createOrderAwaitingKora({
        orderNumber,
        orderType: form.orderType,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        deliveryAddress: form.orderType === 'DELIVERY' ? form.deliveryAddress : undefined,
        deliveryInstructions: form.deliveryInstructions,
        subtotal: subtotal + packFees,
        tax: 0,
        deliveryFee: draftDelivery,
        discount: 0,
        total: draftTotal,
        items: items.map((i) => ({
          foodId: i.foodId,
          foodName: i.foodName,
          portionName: i.portionName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
          packName: i.packName,
        })),
      });

      const checkout = await startKoraCheckout(orderNumber);
      savePendingKoraCheckout({
        reference: checkout.reference,
        orderNumber: checkout.orderNumber,
      });
      return checkout;
    },
    onSuccess: (checkout) => {
      setConfirmOpen(false);
      setPendingForm(null);
      window.location.assign(checkout.checkoutUrl);
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Could not start payment. Please try again.',
        'error',
      );
    },
  });

  function openPaymentConfirm(form: CheckoutForm) {
    setPendingForm(form);
    setConfirmOpen(true);
  }

  function handleConfirmPayment() {
    if (!pendingForm || payWithKora.isPending) return;
    payWithKora.mutate(pendingForm);
  }

  function handleContinueWhatsApp() {
    if (!completed) return;
    openOrderOnWhatsApp(restaurant.whatsapp, completed.whatsapp);
  }

  function handleDismissCompleted() {
    if (!completed) return;
    const orderNumber = completed.orderNumber;
    setCompleted(null);
    navigate(`/track?order=${encodeURIComponent(orderNumber)}`);
  }

  if (verifying) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mb-3 font-display text-3xl font-bold">
          <span className="text-gradient">Confirming payment</span>
        </h1>
        <p className="text-white/60">Please wait while we verify your Kora payment…</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient">Thank you for your order</span>
        </h1>
        <p className="mb-6 text-white/60">
          Tracking number {completed.orderNumber} · {formatCurrency(completed.total)}
        </p>
        <p className="mb-4 text-sm text-white/50">
          You can track your order anytime. A thank-you email with your items and tracking number
          was sent to your inbox.
        </p>
        <PaymentTransferModal
          open
          confirmed
          variant="kora"
          amount={completed.total}
          orderNumber={completed.orderNumber}
          bank={{
            bankName: restaurant.bankName,
            accountName: restaurant.accountName,
            accountNumber: restaurant.accountNumber,
          }}
          onConfirmPaid={() => undefined}
          onContinueWhatsApp={handleContinueWhatsApp}
          onClose={handleDismissCompleted}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-white/60">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="site-container max-w-5xl pb-28 pt-8 sm:pb-12 sm:pt-10">
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight sm:mb-10">
        <span className="text-gradient">Checkout</span>
      </h1>

      <form
        onSubmit={handleSubmit((d) => openPaymentConfirm(d))}
        className="grid gap-8 lg:grid-cols-2 lg:gap-10"
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="checkout-name" className="mb-1.5 block text-sm text-secondary">
              Full Name
            </label>
            <input
              id="checkout-name"
              {...register('customerName')}
              className="w-full rounded-2xl border border-brand-subtle bg-brand-card px-4 py-3.5 outline-none transition focus:border-brand-gold"
            />
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-400">{errors.customerName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="checkout-phone" className="mb-1.5 block text-sm text-secondary">
              Phone
            </label>
            <input
              id="checkout-phone"
              {...register('customerPhone')}
              className="w-full rounded-2xl border border-brand-subtle bg-brand-card px-4 py-3.5 outline-none transition focus:border-brand-gold"
            />
            {errors.customerPhone && (
              <p className="mt-1 text-xs text-red-400">{errors.customerPhone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="checkout-email" className="mb-1.5 block text-sm text-secondary">
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              {...register('customerEmail')}
              className="w-full rounded-2xl border border-brand-subtle bg-brand-card px-4 py-3.5 outline-none transition focus:border-brand-gold"
            />
            {errors.customerEmail && (
              <p className="mt-1 text-xs text-red-400">{errors.customerEmail.message}</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-secondary">Order type</p>
            <div className="flex gap-3">
              {(['DELIVERY', 'PICKUP'] as const).map((type) => (
                <label
                  key={type}
                  className={`flex-1 cursor-pointer rounded-2xl border px-4 py-3 text-center text-sm font-medium transition ${
                    orderType === type
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                      : 'border-brand-subtle bg-brand-card text-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    value={type}
                    {...register('orderType')}
                    className="sr-only"
                  />
                  {type === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                </label>
              ))}
            </div>
          </div>

          {orderType === 'DELIVERY' && (
            <>
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm text-secondary">Delivery address</label>
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={locating}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-gold hover:underline disabled:opacity-50"
                  >
                    <MapPin size={14} />
                    {locating ? 'Locating…' : 'Use current location'}
                  </button>
                </div>
                <textarea
                  {...register('deliveryAddress')}
                  rows={3}
                  className="w-full rounded-2xl border border-brand-subtle bg-brand-card px-4 py-3.5 outline-none transition focus:border-brand-gold"
                />
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-brand-gold hover:underline"
                  >
                    <MapPin size={12} />
                    Open pin in Google Maps
                  </a>
                )}
                {locationBlocked && (
                  <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                    Location access is blocked for this site. Open your browser site settings → set
                    Location to <span className="font-semibold">Allow</span>, then tap{' '}
                    <span className="font-semibold">Use current location</span> again. You can also
                    type your address below.
                  </p>
                )}
                {errors.deliveryAddress && (
                  <p className="mt-1 text-xs text-red-400">{errors.deliveryAddress.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-secondary">Delivery Instructions</label>
                <input
                  {...register('deliveryInstructions')}
                  placeholder="Gate color, floor, call on arrival…"
                  className="w-full rounded-2xl border border-brand-subtle bg-brand-card px-4 py-3.5 outline-none transition focus:border-brand-gold"
                />
              </div>
            </>
          )}

          <div className="rounded-2xl border border-brand-gold/25 bg-brand-gold/10 px-4 py-4 text-sm">
            <p className="font-medium text-brand-gold">Payment: Kora (card / bank)</p>
            <p className="mt-1.5 leading-relaxed text-secondary">
              You’ll choose card or bank transfer on Kora’s secure checkout. Pay the exact amount
              shown — then you’ll return here with your tracking number.
            </p>
          </div>
        </div>

        <div className="h-fit rounded-3xl border border-brand-subtle bg-brand-card p-6 sm:sticky sm:top-24 sm:p-7">
          <h2 className="mb-5 font-display text-xl font-semibold">Order Summary</h2>
          <ul className="mb-5 space-y-4 text-sm">
            {activePacks.map((pack) => (
              <li key={pack.id}>
                <p className="mb-1.5 font-medium text-brand-gold">{pack.name}</p>
                <ul className="space-y-1.5 pl-2 text-secondary">
                  {pack.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.foodName} ({item.portionName}) ×{item.quantity}
                        {item.unitPrice === 0 ? ' · free' : ''}
                      </span>
                      <span className="text-white">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="space-y-2.5 border-t border-brand-subtle pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Items subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {packFees > 0 && (
              <div className="flex justify-between text-secondary">
                <span>Pack fees ({activePacks.length})</span>
                <span>{formatCurrency(packFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-secondary">
              <span>{orderType === 'DELIVERY' ? 'Delivery' : 'Delivery (pickup — free)'}</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-brand-subtle pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-gold">{formatCurrency(chargeTotal)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={payWithKora.isPending}
            className="btn-primary btn-ripple mt-6 hidden w-full py-3.5 sm:flex disabled:opacity-60"
          >
            {payWithKora.isPending ? 'Starting Kora…' : 'Pay with Kora'}
          </button>
        </div>

        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(calc(100vw-5.5rem),20rem)] sm:hidden lg:col-span-2">
          <button
            type="submit"
            disabled={payWithKora.isPending}
            className="glass-panel flex w-full items-center justify-between gap-3 rounded-2xl p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] disabled:opacity-60"
            aria-label="Pay with Kora"
          >
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-white">
                {payWithKora.isPending ? 'Starting Kora…' : 'Pay with Kora'}
              </span>
              <span className="block text-xs text-secondary">{formatCurrency(chargeTotal)}</span>
            </span>
            <span className="shrink-0 rounded-xl bg-brand-gold px-3 py-2 text-xs font-bold text-white">
              Pay
            </span>
          </button>
        </div>
      </form>

      <KoraPaymentConfirmModal
        open={confirmOpen}
        orderTotal={orderTotal}
        processingFee={processingFee}
        chargeTotal={chargeTotal}
        submitting={payWithKora.isPending}
        onConfirm={handleConfirmPayment}
        onClose={() => {
          if (payWithKora.isPending) return;
          setConfirmOpen(false);
          setPendingForm(null);
        }}
      />
    </div>
  );
}
