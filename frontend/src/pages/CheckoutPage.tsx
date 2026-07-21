import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useCart } from '../contexts/CartContext';
import { orderApi, paymentApi, couponApi } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().min(10, 'Valid phone required'),
  customerEmail: z.string().email('Valid email required'),
  orderType: z.enum(['DELIVERY', 'PICKUP']),
  deliveryAddress: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  couponCode: z.string().optional(),
  paymentProvider: z.enum(['PAYSTACK', 'FLUTTERWAVE', 'STRIPE']),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const { getFlattenedItems, subtotal, packFees, activePacks, clearCart } = useCart();
  const items = getFlattenedItems();
  const navigate = useNavigate();
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');

  const taxable = subtotal + packFees;
  const tax = taxable * 0.075;
  const deliveryFee = activePacks.length > 0 ? 1500 : 0;
  const total = taxable + tax + deliveryFee - discount;

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      orderType: 'DELIVERY',
      paymentProvider: 'FLUTTERWAVE',
    },
  });

  const orderType = watch('orderType');

  const createOrder = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      const orderRes = await orderApi.create({
        items: items.map((i) => ({
          foodId: i.foodId,
          foodPortionId: i.foodPortionId,
          portionName: i.portionName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
          packName: i.packName,
        })),
        packFees,
        ...data,
        deliveryAddress: data.orderType === 'DELIVERY' ? data.deliveryAddress : undefined,
      });
      const order = orderRes.data.order;
      const paymentRes = await paymentApi.initialize({
        orderId: order.id,
        provider: data.paymentProvider,
      });
      return { order, payment: paymentRes.data };
    },
    onSuccess: ({ order, payment }) => {
      clearCart();
      if (payment.authorizationUrl) {
        window.open(payment.authorizationUrl, '_blank');
      }
      navigate(`/track?order=${order.orderNumber}`);
    },
  });

  async function applyCoupon() {
    const code = watch('couponCode');
    if (!code) return;
    try {
      const res = await couponApi.validate(code, subtotal + packFees);
      setDiscount(res.data.discount);
      setCouponError('');
    } catch {
      setCouponError('Invalid or expired coupon');
      setDiscount(0);
    }
  }

  if (items.length === 0) {
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

      <form onSubmit={handleSubmit((d) => createOrder.mutate(d))} className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/60">Full Name</label>
            <input {...register('customerName')} className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
            {errors.customerName && <p className="mt-1 text-xs text-red-400">{errors.customerName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/60">Phone</label>
            <input {...register('customerPhone')} className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
            {errors.customerPhone && <p className="mt-1 text-xs text-red-400">{errors.customerPhone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/60">Email</label>
            <input {...register('customerEmail')} type="email" className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
            {errors.customerEmail && <p className="mt-1 text-xs text-red-400">{errors.customerEmail.message}</p>}
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
                <label className="mb-1 block text-sm text-white/60">Delivery Address</label>
                <textarea {...register('deliveryAddress')} rows={2} className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/60">Delivery Instructions</label>
                <input {...register('deliveryInstructions')} className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm text-white/60">Payment Method</label>
            <select {...register('paymentProvider')} className="w-full rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none">
              <option value="PAYSTACK">Paystack</option>
              <option value="FLUTTERWAVE">Flutterwave</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-white/60">Coupon Code</label>
            <div className="flex gap-2">
              <input {...register('couponCode')} className="flex-1 rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold" />
              <button type="button" onClick={applyCoupon} className="rounded-xl bg-brand-gold/20 px-4 text-brand-gold hover:bg-brand-gold/30">
                Apply
              </button>
            </div>
            {couponError && <p className="mt-1 text-xs text-red-400">{couponError}</p>}
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
                    <li key={item.id} className="flex justify-between">
                      <span>{item.foodName} ({item.portionName}) ×{item.quantity}</span>
                      <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between"><span>Items subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {packFees > 0 && (
              <div className="flex justify-between text-white/60">
                <span>Pack fees ({activePacks.length})</span>
                <span>{formatCurrency(packFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-white/60"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
            <div className="flex justify-between text-white/60"><span>Delivery</span><span>{formatCurrency(deliveryFee)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-green-400"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>
            )}
            <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-gold">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={createOrder.isPending}
            className="mt-6 w-full rounded-full bg-brand-gold py-3 font-semibold text-white disabled:opacity-50"
          >
            {createOrder.isPending ? 'Processing...' : 'Place Order & Pay'}
          </button>
        </div>
      </form>
    </div>
  );
}
