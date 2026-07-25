import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useCart } from '../contexts/CartContext';
import { useSiteContentData } from '../hooks/useSiteContent';
import { createOrderInDatabase } from '../services/orders.service';
import { formatCurrency } from '../utils/helpers';
import { openOrderOnWhatsApp, type WhatsAppOrderDetails } from '../utils/whatsapp-order';
import { PaymentTransferModal } from '../components/checkout/PaymentTransferModal';
import { notifyAdminPaymentConfirmed } from '../services/payment-notify.service';
import { useToast } from '../components/ui/Toast';

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

type CartSnapshotItem = {
  id: string;
  foodId: string;
  foodPortionId: string;
  foodName: string;
  portionName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  packName?: string;
  image?: string;
};

/** Draft payment — order is NOT in admin until “I have made payment”. */
type PaymentDraft = {
  orderNumber: string;
  form: CheckoutForm;
  total: number;
  subtotal: number;
  packFees: number;
  tax: number;
  deliveryFee: number;
  items: CartSnapshotItem[];
};

type CompletedOrder = {
  orderNumber: string;
  total: number;
  whatsapp: WhatsAppOrderDetails;
};

function nextOrderNumber() {
  return `AY-${Date.now().toString().slice(-8)}`;
}

export default function CheckoutPage() {
  const { getFlattenedItems, subtotal, packFees, activePacks, clearCart } = useCart();
  const { restaurant } = useSiteContentData();
  const { showToast } = useToast();
  const items = getFlattenedItems();
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);

  const taxable = subtotal + packFees;
  const tax = taxable * 0.075;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: 'DELIVERY',
    },
  });

  const orderType = watch('orderType');
  const deliveryFee = orderType === 'DELIVERY' && activePacks.length > 0 ? 1500 : 0;
  const total = taxable + tax + deliveryFee;
  /** Open payment modal only — do not create the order yet. */
  function openPaymentDraft(form: CheckoutForm) {
    const snapshotItems: CartSnapshotItem[] = items.map((i) => ({
      id: i.id,
      foodId: i.foodId,
      foodPortionId: i.foodPortionId,
      foodName: i.foodName,
      portionName: i.portionName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      notes: i.notes,
      packName: i.packName,
      image: i.image,
    }));

    const draftDelivery =
      form.orderType === 'DELIVERY' && activePacks.length > 0 ? 1500 : 0;
    const draftTax = (subtotal + packFees) * 0.075;
    const draftTotal = subtotal + packFees + draftTax + draftDelivery;

    setDraft({
      orderNumber: nextOrderNumber(),
      form,
      total: draftTotal,
      subtotal: subtotal + packFees,
      packFees,
      tax: draftTax,
      deliveryFee: draftDelivery,
      items: snapshotItems,
    });
  }

  const confirmPaid = useMutation({
    mutationFn: async (payment: PaymentDraft) => {
      const { form, items: snapItems } = payment;

      const order = await createOrderInDatabase({
        orderNumber: payment.orderNumber,
        orderType: form.orderType,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        deliveryAddress: form.orderType === 'DELIVERY' ? form.deliveryAddress : undefined,
        deliveryInstructions: form.deliveryInstructions,
        subtotal: payment.subtotal,
        tax: payment.tax,
        deliveryFee: payment.deliveryFee,
        discount: 0,
        total: payment.total,
        items: snapItems.map((i) => ({
          foodId: i.foodId,
          foodName: i.foodName,
          portionName: i.portionName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
          packName: i.packName,
        })),
      });

      return {
        orderNumber: order.orderNumber,
        total: order.total,
        form,
        snapItems,
      };
    },
    onSuccess: ({ orderNumber, total: orderTotal, form, snapItems }) => {
      const whatsapp: WhatsAppOrderDetails = {
        orderNumber,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        orderType: form.orderType,
        deliveryAddress: form.orderType === 'DELIVERY' ? form.deliveryAddress : undefined,
        deliveryInstructions: form.deliveryInstructions,
        items: snapItems.map((i) => ({
          foodName: i.foodName,
          portionName: i.portionName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          packName: i.packName,
          notes: i.notes,
        })),
        total: orderTotal,
        paid: true,
      };

      clearCart();
      setDraft(null);
      setCompleted({ orderNumber, total: orderTotal, whatsapp });
      void notifyAdminPaymentConfirmed(whatsapp);
    },
    onError: (err) => {
      showToast(
        err instanceof Error
          ? err.message
          : 'Could not save order to database. Please try again.',
        'error',
      );
    },
  });

  function handleCancelPayment() {
    setDraft(null);
  }

  async function handleConfirmPaid() {
    if (!draft) return;
    await confirmPaid.mutateAsync(draft);
  }

  function handleContinueWhatsApp() {
    if (!completed) return;
    openOrderOnWhatsApp(restaurant.whatsapp, completed.whatsapp);
  }

  if (completed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient">Order placed</span>
        </h1>
        <p className="mb-6 text-white/60">
          Tracking number {completed.orderNumber} · {formatCurrency(completed.total)}
        </p>
        <PaymentTransferModal
          open
          confirmed
          amount={completed.total}
          orderNumber={completed.orderNumber}
          bank={{
            bankName: restaurant.bankName,
            accountName: restaurant.accountName,
            accountNumber: restaurant.accountNumber,
          }}
          onConfirmPaid={() => undefined}
          onContinueWhatsApp={handleContinueWhatsApp}
        />
      </div>
    );
  }

  if (items.length === 0 && !draft) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-white/60">Your cart is empty</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-display text-4xl font-bold">
        <span className="text-gradient">Checkout</span>
      </h1>

      <form
        onSubmit={handleSubmit((d) => openPaymentDraft(d))}
        className="grid gap-8 lg:grid-cols-2"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-name" className="mb-1 block text-sm text-white/60">
              Full Name
            </label>
            <input
              id="checkout-name"
              {...register('customerName')}
              className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
            />
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-400">{errors.customerName.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="checkout-phone" className="mb-1 block text-sm text-white/60">
              Phone
            </label>
            <input
              id="checkout-phone"
              {...register('customerPhone')}
              className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
            />
            {errors.customerPhone && (
              <p className="mt-1 text-xs text-red-400">{errors.customerPhone.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="checkout-email" className="mb-1 block text-sm text-white/60">
              Email
            </label>
            <input
              id="checkout-email"
              {...register('customerEmail')}
              type="email"
              className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
            />
            {errors.customerEmail && (
              <p className="mt-1 text-xs text-red-400">{errors.customerEmail.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/60">Order Type</label>
            <div className="flex gap-3">
              {(['DELIVERY', 'PICKUP'] as const).map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input type="radio" {...register('orderType')} value={type} />
                  <span className="text-sm">{type === 'DELIVERY' ? 'Delivery' : 'Pickup'}</span>
                </label>
              ))}
            </div>
          </div>

          {orderType === 'DELIVERY' && (
            <>
              <div>
                <label htmlFor="checkout-address" className="mb-1 block text-sm text-white/60">
                  Delivery Address
                </label>
                <textarea
                  id="checkout-address"
                  {...register('deliveryAddress')}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
                />
                {errors.deliveryAddress && (
                  <p className="mt-1 text-xs text-red-400">{errors.deliveryAddress.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/60">Delivery Instructions</label>
                <input
                  {...register('deliveryInstructions')}
                  className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
                />
              </div>
            </>
          )}

          <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-white/80">
            <p className="font-medium text-brand-gold">Payment: Bank transfer</p>
            <p className="mt-1 text-white/60">
              We’ll show the account details next. Your order is only sent to the kitchen after you
              tap “I have made payment”. You can close the payment screen to add more items first.
            </p>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">Order Summary</h2>
          <ul className="mb-4 space-y-3 text-sm">
            {activePacks.map((pack) => (
              <li key={pack.id}>
                <p className="mb-1 font-medium text-brand-gold">{pack.name}</p>
                <ul className="space-y-1 pl-2 text-white/80">
                  {pack.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.foodName} ({item.portionName}) ×{item.quantity}
                        {item.unitPrice === 0 ? ' · free' : ''}
                      </span>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span>Items subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {packFees > 0 && (
              <div className="flex justify-between text-white/60">
                <span>Pack fees ({activePacks.length})</span>
                <span>{formatCurrency(packFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/60">
              <span>Tax</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>{orderType === 'DELIVERY' ? 'Delivery' : 'Delivery (pickup — free)'}</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-gold">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-brand-gold py-3 font-semibold text-white disabled:opacity-50"
          >
            Continue to payment
          </button>
        </div>
      </form>

      {draft && !completed && (
        <PaymentTransferModal
          open
          amount={draft.total}
          orderNumber={draft.orderNumber}
          bank={{
            bankName: restaurant.bankName,
            accountName: restaurant.accountName,
            accountNumber: restaurant.accountNumber,
          }}
          onConfirmPaid={handleConfirmPaid}
          onContinueWhatsApp={handleContinueWhatsApp}
          onClose={handleCancelPayment}
        />
      )}
    </div>
  );
}
