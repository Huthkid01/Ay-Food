import { useEffect, useMemo, useRef, useState } from 'react';
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
import { PaymentTransferModal } from '../components/checkout/PaymentTransferModal';
import { useToast } from '../components/ui/Toast';
import {
  siteSettingsService,
} from '../services/site-settings.service';
import {
  geocodeDeliveryAddress,
  geolocationErrorMessage,
  getGeolocationPermission,
  locationBlockedHelp,
  resolveDeliveryAddressFromGps,
} from '../utils/delivery-location';
import { createOrderInDatabase } from '../services/orders.service';
import { notifyAdminPaymentConfirmed } from '../services/payment-notify.service';
import {
  computeDeliveryFee,
  DEFAULT_DELIVERY_RULES,
  normalizeDeliveryRules,
} from '../utils/delivery-fee';
import {
  clearCheckoutDraft,
  readCheckoutDraft,
  saveCheckoutDraft,
} from '../utils/checkout-draft';

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

/** Rough bike ride time in Ogijo / Ikorodu traffic (not including kitchen prep). */
function estimateRideMinutes(distanceKm: number): string {
  if (distanceKm <= 2.5) return '10–15';
  if (distanceKm <= 5) return '15–25';
  if (distanceKm <= 8) return '25–40';
  if (distanceKm <= 12) return '35–55';
  if (distanceKm <= 18) return '50–80';
  return '60+';
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getFlattenedItems, subtotal, packFees, activePacks, clearCart } = useCart();
  const { restaurant } = useSiteContentData();
  const { showToast } = useToast();
  const items = getFlattenedItems();
  const savedDraft = useMemo(() => readCheckoutDraft(), []);
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsService.get(),
    staleTime: 60_000,
  });
  const deliveryRules = normalizeDeliveryRules(siteSettings?.delivery_rules ?? DEFAULT_DELIVERY_RULES);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<CheckoutForm | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState('');
  const [locating, setLocating] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [addressLookupFailed, setAddressLookupFailed] = useState(false);
  const [mapsUrl, setMapsUrl] = useState<string | null>(savedDraft?.mapsUrl ?? null);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [deliveryPoint, setDeliveryPoint] = useState<{
    lat: number;
    lon: number;
    city?: string | null;
    state?: string | null;
    landmark?: string | null;
  } | null>(savedDraft?.deliveryPoint ?? null);
  const skipAddressGeocodeRef = useRef(Boolean(savedDraft?.deliveryPoint));
  const lastGeocodedAddressRef = useRef(
    savedDraft?.deliveryPoint && savedDraft.form.deliveryAddress?.trim()
      ? savedDraft.form.deliveryAddress.trim()
      : '',
  );
  const lastFailedAddressRef = useRef('');

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
      orderType: savedDraft?.form.orderType ?? 'DELIVERY',
      customerName: savedDraft?.form.customerName ?? '',
      customerPhone: savedDraft?.form.customerPhone ?? '',
      customerEmail: savedDraft?.form.customerEmail ?? '',
      deliveryAddress: savedDraft?.form.deliveryAddress ?? '',
      deliveryInstructions: savedDraft?.form.deliveryInstructions ?? '',
    },
  });

  const orderType = watch('orderType');
  const deliveryAddressValue = watch('deliveryAddress');
  const customerName = watch('customerName');
  const customerPhone = watch('customerPhone');
  const customerEmail = watch('customerEmail');
  const deliveryInstructions = watch('deliveryInstructions');

  useEffect(() => {
    saveCheckoutDraft({
      form: {
        customerName,
        customerPhone,
        customerEmail,
        orderType,
        deliveryAddress: deliveryAddressValue,
        deliveryInstructions,
      },
      deliveryPoint,
      mapsUrl,
    });
  }, [
    customerName,
    customerPhone,
    customerEmail,
    orderType,
    deliveryAddressValue,
    deliveryInstructions,
    deliveryPoint,
    mapsUrl,
  ]);
  const hasDeliveryAddress = Boolean(deliveryAddressValue?.trim());
  const needsLocationForFee =
    orderType === 'DELIVERY' && activePacks.length > 0 && !deliveryPoint && !geocodingAddress;
  const needsAddressForDelivery =
    orderType === 'DELIVERY' && activePacks.length > 0 && !hasDeliveryAddress;
  const distanceResult =
    orderType === 'DELIVERY' && activePacks.length > 0 && deliveryPoint
      ? computeDeliveryFee(deliveryRules, deliveryPoint.lat, deliveryPoint.lon)
      : null;
  const deliveryFee =
    orderType === 'DELIVERY' && activePacks.length > 0 && distanceResult && !distanceResult.manualQuoteOnly
      ? distanceResult.fee
      : 0;
  const manualQuoteOnly = Boolean(distanceResult?.manualQuoteOnly);
  const canPayDelivery =
    orderType !== 'DELIVERY' ||
    (hasDeliveryAddress && Boolean(deliveryPoint) && !manualQuoteOnly && !geocodingAddress);
  const orderTotal = itemsTotal + deliveryFee;

  useEffect(() => {
    // Ignore leftover Kora return URLs from older checkouts
    if (searchParams.get('kora') === 'return') {
      showToast('Card checkout is no longer used — please pay via OPay transfer', 'error');
    }
  }, [searchParams, showToast]);

  useEffect(() => {
    if (orderType !== 'DELIVERY') {
      setGeocodingAddress(false);
      setAddressLookupFailed(false);
      return;
    }

    const address = deliveryAddressValue?.trim() ?? '';
    if (!address) {
      setDeliveryPoint(null);
      setMapsUrl(null);
      setGeocodingAddress(false);
      setAddressLookupFailed(false);
      lastGeocodedAddressRef.current = '';
      lastFailedAddressRef.current = '';
      return;
    }

    if (skipAddressGeocodeRef.current) {
      skipAddressGeocodeRef.current = false;
      lastGeocodedAddressRef.current = address;
      lastFailedAddressRef.current = '';
      setAddressLookupFailed(false);
      setGeocodingAddress(false);
      return;
    }

    if (address === lastGeocodedAddressRef.current) {
      return;
    }

    if (address === lastFailedAddressRef.current) {
      setAddressLookupFailed(true);
      setGeocodingAddress(false);
      return;
    }

    if (address.length < 8) {
      setDeliveryPoint(null);
      setMapsUrl(null);
      setGeocodingAddress(false);
      setAddressLookupFailed(false);
      lastGeocodedAddressRef.current = '';
      return;
    }

    let cancelled = false;
    setGeocodingAddress(true);
    setAddressLookupFailed(false);

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await geocodeDeliveryAddress(address, {
          lat: deliveryRules.origin.lat,
          lon: deliveryRules.origin.lon,
        });
        if (cancelled) return;

        if (result) {
          lastGeocodedAddressRef.current = address;
          lastFailedAddressRef.current = '';
          setDeliveryPoint({
            lat: result.lat,
            lon: result.lon,
            city: result.city,
            state: result.state,
            landmark: result.landmark,
          });
          setMapsUrl(result.mapsUrl);
          setAddressLookupFailed(false);
        } else {
          lastFailedAddressRef.current = address;
          lastGeocodedAddressRef.current = '';
          setDeliveryPoint(null);
          setMapsUrl(null);
          setAddressLookupFailed(true);
        }
        setGeocodingAddress(false);
      })();
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderType, deliveryAddressValue, deliveryRules.origin.lat, deliveryRules.origin.lon]);

  async function handleUseCurrentLocation() {
    setLocating(true);
    setLocationBlocked(false);
    setAddressLookupFailed(false);
    try {
      const permission = await getGeolocationPermission();
      if (permission === 'denied') {
        setLocationBlocked(true);
        showToast(locationBlockedHelp(), 'error');
        return;
      }

      const { address, mapsUrl: pinUrl, lat, lon, city, state, landmark } =
        await resolveDeliveryAddressFromGps();
      skipAddressGeocodeRef.current = true;
      lastGeocodedAddressRef.current = address.trim();
      lastFailedAddressRef.current = '';
      setValue('deliveryAddress', address, { shouldValidate: true });
      setMapsUrl(pinUrl);
      setDeliveryPoint({ lat, lon, city, state, landmark });
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

  const placeOrder = useMutation({
    mutationFn: async (form: CheckoutForm) => {
      if (form.orderType === 'DELIVERY' && !form.deliveryAddress?.trim()) {
        throw new Error('Please enter your delivery address before paying');
      }
      if (form.orderType === 'DELIVERY' && !deliveryPoint) {
        throw new Error(
          addressLookupFailed
            ? 'We couldn’t find that address. Tap “Use current location”, or enter a clearer street / landmark.'
            : 'Enter your address or tap “Use current location” so we can calculate the delivery fee',
        );
      }
      if (form.orderType === 'DELIVERY' && manualQuoteOnly) {
        throw new Error('This area needs a special delivery quote — contact us on WhatsApp first');
      }
      const draftDelivery =
        form.orderType === 'DELIVERY' && activePacks.length > 0 ? deliveryFee : 0;
      const draftTotal = subtotal + packFees + draftDelivery;
      const orderNumber = pendingOrderNumber || nextOrderNumber();

      await createOrderInDatabase({
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

      const whatsapp: WhatsAppOrderDetails = {
        orderNumber,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        orderType: form.orderType,
        deliveryAddress: form.orderType === 'DELIVERY' ? form.deliveryAddress : undefined,
        deliveryInstructions: form.deliveryInstructions,
        items: items.map((i) => ({
          foodName: i.foodName,
          portionName: i.portionName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          packName: i.packName,
        })),
        subtotal: subtotal + packFees,
        packFees,
        deliveryFee: draftDelivery,
        total: draftTotal,
        paid: false,
        paymentProvider: 'OPay',
        paymentNote:
          'I have transferred via OPay. Please confirm when you see the payment — thank you!',
      };

      void notifyAdminPaymentConfirmed(whatsapp).catch(() => undefined);

      clearCart();
      clearCheckoutDraft();
      setCompleted({
        orderNumber,
        total: draftTotal,
        whatsapp,
      });
      return { orderNumber, total: draftTotal, whatsapp };
    },
    onError: (err) => {
      showToast(
        err instanceof Error ? err.message : 'Could not place order. Please try again.',
        'error',
      );
    },
  });

  function openPaymentConfirm(form: CheckoutForm) {
    if (form.orderType === 'DELIVERY' && !form.deliveryAddress?.trim()) {
      showToast('Please enter your delivery address before paying', 'error');
      return;
    }
    if (form.orderType === 'DELIVERY' && !deliveryPoint) {
      showToast(
        addressLookupFailed
          ? 'We couldn’t find that address. Tap “Use current location”, or enter a clearer street / landmark.'
          : 'Enter your address or tap “Use current location” for the delivery fee',
        'error',
      );
      return;
    }
    if (form.orderType === 'DELIVERY' && manualQuoteOnly) {
      showToast('This area needs WhatsApp confirmation for special delivery', 'error');
      return;
    }
    setPendingForm(form);
    setPendingOrderNumber(nextOrderNumber());
    setTransferOpen(true);
  }

  async function handleConfirmPaid() {
    if (!pendingForm) throw new Error('Missing checkout details');
    await placeOrder.mutateAsync(pendingForm);
    // Modal automatically switches to "Payment awaiting confirmation" step.
    // Customer can then choose to open WhatsApp or skip to tracking.
  }

  function handleContinueWhatsApp() {
    if (!completed) return;
    openOrderOnWhatsApp(restaurant.whatsapp, completed.whatsapp);
  }

  function handleDismissCompleted() {
    if (!completed) return;
    const orderNumber = completed.orderNumber;
    setCompleted(null);
    setTransferOpen(false);
    setPendingForm(null);
    navigate(`/track?order=${encodeURIComponent(orderNumber)}`);
  }


  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-white/60">Your cart is empty</p>
      </div>
    );
  }

  const locationHint =
    deliveryPoint && orderType === 'DELIVERY'
      ? [deliveryPoint.landmark, deliveryPoint.city, deliveryPoint.state].filter(Boolean).join(', ')
      : null;

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
              Phone (WhatsApp number)
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
                  <label htmlFor="checkout-address" className="block text-sm text-secondary">
                    Delivery address
                  </label>
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
                  id="checkout-address"
                  {...register('deliveryAddress')}
                  rows={3}
                  placeholder="Type your street / landmark, or use current location"
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
                {locationHint && (
                  <p className="mt-1 text-xs text-white/45">
                    Detected area: {locationHint}
                    {distanceResult
                      ? ` · ${distanceResult.distanceKm.toFixed(1)} km from ${deliveryRules.origin.label}`
                      : ''}
                  </p>
                )}
                {geocodingAddress && (
                  <p className="mt-2 text-xs text-white/55">Finding your delivery fee…</p>
                )}
                {addressLookupFailed && !geocodingAddress && (
                  <p className="mt-2 rounded-xl border border-brand-gold/35 bg-brand-gold/10 px-3 py-2 text-xs leading-relaxed text-brand-gold/95">
                    We couldn’t locate that address. Try a clearer street or landmark, or tap{' '}
                    <span className="font-semibold">Use current location</span> so we can calculate
                    your delivery fee.
                  </p>
                )}
                {needsLocationForFee && !addressLookupFailed && !geocodingAddress && hasDeliveryAddress && (
                  <p className="mt-2 rounded-xl border border-brand-gold/35 bg-brand-gold/10 px-3 py-2 text-xs leading-relaxed text-brand-gold/95">
                    Keep typing a full address (street / landmark / area), or tap{' '}
                    <span className="font-semibold">Use current location</span> for your delivery fee.
                  </p>
                )}
                {!hasDeliveryAddress && orderType === 'DELIVERY' && (
                  <p className="mt-2 rounded-xl border border-brand-gold/35 bg-brand-gold/10 px-3 py-2 text-xs leading-relaxed text-brand-gold/95">
                    Type your delivery address, or tap{' '}
                    <span className="font-semibold">Use current location</span>. We’ll calculate the
                    fee from either.
                  </p>
                )}
                {locationBlocked && (
                  <p className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                    Location access is blocked for this site. Open your browser site settings → set
                    Location to <span className="font-semibold">Allow</span>, then tap{' '}
                    <span className="font-semibold">Use current location</span> again.
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
            <p className="font-medium text-brand-gold">Payment: OPay transfer</p>
            <p className="mt-1.5 leading-relaxed text-secondary">
              Transfer the exact total to our OPay account, then tap “I have made payment”. We’ll
              open WhatsApp so you can send your order details for confirmation.
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
              <span>
                {orderType === 'DELIVERY' && geocodingAddress
                  ? 'Calculating…'
                  : orderType === 'DELIVERY' && needsLocationForFee
                    ? 'Set address'
                    : formatCurrency(deliveryFee)}
              </span>
            </div>
            {needsAddressForDelivery && (
              <p className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-brand-gold/95">
                Enter your delivery address to continue.
              </p>
            )}
            {geocodingAddress && (
              <p className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-brand-gold/95">
                Calculating delivery fee from your address…
              </p>
            )}
            {addressLookupFailed && !geocodingAddress && (
              <p className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-brand-gold/95">
                Address not found — use current location or enter a clearer address.
              </p>
            )}
            {needsLocationForFee && !needsAddressForDelivery && !addressLookupFailed && !geocodingAddress && (
              <p className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-brand-gold/95">
                Finish your address or use current location for the delivery fee.
              </p>
            )}
            {distanceResult && !distanceResult.manualQuoteOnly && (
              <p className="text-xs text-white/45">
                About {estimateRideMinutes(distanceResult.distanceKm)} mins ride from kitchen
                (traffic can change this).
              </p>
            )}
            {distanceResult?.requiresConfirm && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                {distanceResult.note ||
                  'Long-distance delivery: please confirm by call/WhatsApp before payment.'}
              </p>
            )}
            {manualQuoteOnly && restaurant.whatsapp ? (
              <a
                href={restaurant.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-xs font-medium text-brand-gold hover:underline"
              >
                Contact on WhatsApp to confirm special delivery
              </a>
            ) : null}
            <div className="flex justify-between border-t border-brand-subtle pt-3 text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-gold">{formatCurrency(orderTotal)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={placeOrder.isPending || !canPayDelivery}
            className="btn-primary btn-ripple mt-6 hidden w-full py-3.5 sm:flex disabled:opacity-60"
          >
            {manualQuoteOnly
              ? 'Special Delivery — Contact on WhatsApp'
              : needsAddressForDelivery
                ? 'Enter delivery address'
                : geocodingAddress
                  ? 'Finding delivery fee…'
                  : addressLookupFailed || needsLocationForFee
                    ? 'Use location or clearer address'
                    : placeOrder.isPending
                      ? 'Placing order…'
                      : 'Pay with OPay'}
          </button>
        </div>

        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(calc(100vw-5.5rem),20rem)] sm:hidden lg:col-span-2">
          <button
            type="submit"
            disabled={placeOrder.isPending || !canPayDelivery}
            className="glass-panel flex w-full items-center justify-between gap-3 rounded-2xl p-3 shadow-[0_12px_40px_rgb(0_0_0/0.45)] disabled:opacity-60"
            aria-label="Pay with OPay"
          >
            <span className="min-w-0 text-left">
              <span className="block text-sm font-semibold text-white">
                {manualQuoteOnly
                  ? 'Special Delivery'
                  : needsAddressForDelivery
                    ? 'Enter address'
                    : geocodingAddress
                      ? 'Finding fee…'
                      : addressLookupFailed || needsLocationForFee
                        ? 'Set location'
                        : placeOrder.isPending
                          ? 'Placing…'
                          : 'Pay with OPay'}
              </span>
              <span className="block text-xs text-secondary">{formatCurrency(orderTotal)}</span>
            </span>
            <span className="shrink-0 rounded-xl bg-brand-gold px-3 py-2 text-xs font-bold text-white">
              Pay
            </span>
          </button>
        </div>
      </form>

      <PaymentTransferModal
        open={transferOpen}
        confirmed={Boolean(completed)}
        amount={orderTotal}
        orderNumber={completed?.orderNumber || pendingOrderNumber}
        bank={{
          bankName: restaurant.bankName,
          accountName: restaurant.accountName,
          accountNumber: restaurant.accountNumber,
        }}
        onConfirmPaid={handleConfirmPaid}
        onContinueWhatsApp={handleContinueWhatsApp}
        onClose={() => {
          if (placeOrder.isPending) return;
          setTransferOpen(false);
          setPendingForm(null);
          if (completed) handleDismissCompleted();
        }}
      />
    </div>
  );
}
