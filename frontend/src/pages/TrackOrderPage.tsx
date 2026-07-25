import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Clock, Package, Truck, Home } from 'lucide-react';
import { getOrderByNumber } from '../services/orders.service';
import { formatCurrency } from '../utils/helpers';

const STATUS_STEPS = [
  { key: 'RECEIVED', label: 'Order Received', icon: Check },
  { key: 'PREPARING', label: 'Preparing', icon: Clock },
  { key: 'PACKING', label: 'Packing', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('order') ?? '').trim().toUpperCase();
  const [orderNumber, setOrderNumber] = useState(initial);
  const [search, setSearch] = useState(initial);

  const hasSearch = search.trim().length > 0;

  const { data: order, isLoading, error, isFetching } = useQuery({
    queryKey: ['track-order', search.trim()],
    queryFn: async () => {
      const found = await getOrderByNumber(search.trim());
      if (!found) throw new Error('Order not found');
      return found;
    },
    enabled: hasSearch,
    refetchInterval: hasSearch ? 10_000 : false,
    retry: false,
  });

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order?.status);
  const showResults = hasSearch;

  function clearTracking() {
    setOrderNumber('');
    setSearch('');
    setSearchParams({}, { replace: true });
  }

  function onInputChange(value: string) {
    const next = value.toUpperCase();
    setOrderNumber(next);
    // Clearing the field resets results immediately (no leftover “In progress…”)
    if (!next.trim()) {
      setSearch('');
      if (searchParams.get('order')) {
        setSearchParams({}, { replace: true });
      }
    }
  }

  function runTrack() {
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      clearTracking();
      return;
    }
    setSearch(trimmed);
    setSearchParams({ order: trimmed }, { replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 font-display text-4xl font-bold">
        Track Your <span className="text-gradient">Order</span>
      </h1>
      <p className="mb-8 text-white/60">Enter your order number to see live updates</p>

      <div className="mb-8 flex gap-2">
        <input
          value={orderNumber}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runTrack();
          }}
          placeholder="e.g. AY-12345678"
          className="flex-1 rounded-xl border border-white/10 bg-brand-dark-light px-4 py-3 outline-none focus:border-brand-gold"
          aria-label="Order tracking number"
        />
        {orderNumber.trim() ? (
          <button
            type="button"
            onClick={clearTracking}
            className="rounded-xl border border-white/20 px-4 font-semibold text-white/80 hover:border-brand-gold hover:text-brand-gold"
          >
            Clear
          </button>
        ) : null}
        <button
          type="button"
          onClick={runTrack}
          className="rounded-xl bg-brand-gold px-6 font-semibold text-white hover:bg-brand-gold-dark"
        >
          Track
        </button>
      </div>

      {!showResults && (
        <p className="rounded-2xl border border-white/10 bg-brand-dark-light p-6 text-center text-sm text-white/50">
          Enter your tracking number above, then tap Track.
        </p>
      )}

      {showResults && (isLoading || isFetching) && !order && (
        <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />
      )}

      {showResults && error && !isLoading && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          Order not found. Please check your order number.
        </div>
      )}

      {showResults && order && (
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

          {order.status === 'CANCELLED' ? (
            <div className="mb-8 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <p className="font-semibold text-red-300">This order was cancelled</p>
              <p className="mt-1 text-sm text-white/60">
                If you already paid, contact support with your order number.
              </p>
            </div>
          ) : (
          <div className="mb-8 space-y-4">
            {STATUS_STEPS.map((step, i) => {
              const Icon = step.icon;
              const isComplete = currentIndex >= 0 && i <= currentIndex;
              const isCurrent = currentIndex >= 0 && i === currentIndex;
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
                      <p className="animate-pulse text-xs text-brand-gold">In progress...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <div className="rounded-xl border border-white/10 bg-brand-dark-light p-4">
            <h3 className="mb-3 font-semibold">Order Items</h3>
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0"
              >
                <span>
                  {item.food.name} ({item.portionName}) ×{item.quantity}
                </span>
                <span className="text-brand-gold">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
