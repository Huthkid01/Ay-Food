import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Clock, ChefHat, Package, Truck, Home } from 'lucide-react';
import { orderApi } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const STATUS_STEPS = [
  { key: 'RECEIVED', label: 'Order Received', icon: Check },
  { key: 'PREPARING', label: 'Preparing', icon: Clock },
  { key: 'COOKING', label: 'Cooking', icon: ChefHat },
  { key: 'PACKING', label: 'Packing', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '');
  const [search, setSearch] = useState(orderNumber);

  const { data, isLoading, error } = useQuery({
    queryKey: ['track-order', search],
    queryFn: () => orderApi.track(search).then((r) => r.data),
    enabled: !!search,
    refetchInterval: 10000,
  });

  const order = data?.order;
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order?.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl font-bold">
        Track Your <span className="text-gradient">Order</span>
      </h1>
      <p className="mb-8 text-white/60">Enter your order number to see live updates</p>

      <div className="mb-8 flex gap-2">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="e.g. AY20260721-ABC123"
          className="flex-1 rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
        />
        <button
          onClick={() => setSearch(orderNumber)}
          className="rounded-xl bg-brand-gold px-6 font-semibold text-white hover:bg-brand-gold-dark"
        >
          Track
        </button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          Order not found. Please check your order number.
        </div>
      )}

      {order && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 rounded-xl border border-white/10 bg-brand-dark-light p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-white/60">Order Number</p>
                <p className="font-mono font-bold text-brand-gold">{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Total</p>
                <p className="font-bold">{formatCurrency(order.total)}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            {STATUS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isComplete = i <= currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                      isComplete ? 'bg-brand-gold text-white' : 'bg-brand-dark-light text-white/30'
                    } ${isCurrent ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-dark' : ''}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className={isComplete ? 'font-medium' : 'text-white/40'}>{step.label}</p>
                    {isCurrent && (
                      <p className="text-xs text-brand-gold animate-pulse">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/10 bg-brand-dark-light p-4">
            <h3 className="mb-3 font-semibold">Order Items</h3>
            {order.items.map((item: { id: string; food: { name: string }; portionName: string; quantity: number; totalPrice: number }) => (
              <div key={item.id} className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
                <span>{item.food.name} ({item.portionName}) ×{item.quantity}</span>
                <span className="text-brand-gold">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
