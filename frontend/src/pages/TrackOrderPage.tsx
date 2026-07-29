import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, Package, Truck, Home } from 'lucide-react';
import { getOrderByNumber } from '../services/orders.service';
import type { AdminOrderItem } from '../services/admin-store';
import { formatCurrency } from '../utils/helpers';
import { comparePackNames, normalizePackName } from '../utils/pack-groups';

const STATUS_STEPS = [
  { key: 'RECEIVED', label: 'Order Received', icon: Check },
  { key: 'PREPARING', label: 'Preparing', icon: Clock },
  { key: 'PACKING', label: 'Packing', icon: Package },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home },
];

function groupItemsByPack(items: AdminOrderItem[]) {
  const groups: Array<{ packName: string; items: AdminOrderItem[]; subtotal: number }> = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
    const packName = normalizePackName(item.packName);
    let idx = indexByName.get(packName);
    if (idx === undefined) {
      idx = groups.length;
      indexByName.set(packName, idx);
      groups.push({ packName, items: [], subtotal: 0 });
    }
    groups[idx].items.push(item);
    groups[idx].subtotal += Number(item.totalPrice) || 0;
  }

  groups.sort((a, b) => comparePackNames(a.packName, b.packName));
  return groups;
}

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

  const currentIndex = (() => {
    if (!order) return -1;
    if (order.status === 'CANCELLED') return -1;
    // Show “Order Received” as active only after admin confirms payment
    if (!order.paymentPaid && order.status === 'RECEIVED') return -1;
    if (!order.paymentPaid) {
      // Unpaid but kitchen already moved on — still show kitchen progress
      return STATUS_STEPS.findIndex((s) => s.key === order.status);
    }
    return STATUS_STEPS.findIndex((s) => s.key === order.status);
  })();
  const showResults = hasSearch;
  const packGroups = useMemo(
    () => (order?.items ? groupItemsByPack(order.items) : []),
    [order?.items],
  );

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
        <div className="animate-fade-up">
          <div className="mb-6 rounded-xl border border-white/10 bg-brand-dark-light p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-sm text-white/60">Order Number</p>
                <p className="font-mono font-bold text-brand-gold">{order.orderNumber}</p>
                <p className="mt-1 text-xs text-white/50">
                  {order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                  {order.orderType === 'DELIVERY' && order.deliveryAddress
                    ? ` · ${order.deliveryAddress}`
                    : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Total</p>
                <p className="font-bold">{formatCurrency(order.total)}</p>
                {order.deliveryFee > 0 ? (
                  <p className="mt-1 text-xs text-white/45">
                    incl. {formatCurrency(order.deliveryFee)} delivery
                  </p>
                ) : order.orderType === 'PICKUP' ? (
                  <p className="mt-1 text-xs text-white/45">No delivery fee</p>
                ) : null}
              </div>
            </div>
          </div>

          {order.paymentPaid === false && order.status !== 'CANCELLED' && (
            <div className="mb-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
              Payment is awaiting confirmation. Once the restaurant confirms your OPay transfer,
              you’ll get an email and your order will show as received.
            </div>
          )}
          {order.paymentPaid && order.status === 'RECEIVED' && (
            <div className="mb-6 rounded-xl border border-brand-green/35 bg-brand-green/10 px-4 py-3 text-sm text-brand-green/95">
              Payment received — your order is confirmed.
            </div>
          )}

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
                    {isCurrent && step.key !== 'DELIVERED' ? (
                      <p className="animate-pulse text-xs text-brand-gold">In progress...</p>
                    ) : null}
                    {isCurrent && step.key === 'DELIVERED' ? (
                      <p className="text-xs text-brand-gold">Completed</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <div className="rounded-xl border border-white/10 bg-brand-dark-light p-4">
            <h3 className="mb-3 font-semibold">Order Items</h3>
            {packGroups.length === 0 ? (
              <p className="text-sm text-white/50">No items on this order.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {packGroups.map((pack) => (
                  <article
                    key={pack.packName}
                    className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-brand-dark/70 p-3"
                  >
                    <header className="mb-2 border-b border-white/10 pb-2">
                      <p className="truncate text-sm font-semibold text-brand-gold">{pack.packName}</p>
                      <p className="text-[11px] text-white/45">
                        {pack.items.length} item{pack.items.length === 1 ? '' : 's'}
                      </p>
                    </header>
                    <ul className="flex flex-1 flex-col gap-2 text-xs sm:text-sm">
                      {pack.items.map((item) => (
                        <li key={item.id} className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 leading-snug text-white/85">
                              {item.food.name}
                              <span className="text-white/45">
                                {' '}
                                ({item.portionName}) ×{item.quantity}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium text-brand-gold">
                              {formatCurrency(item.totalPrice)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <footer className="mt-3 border-t border-white/10 pt-2 text-xs">
                      <div className="flex justify-between gap-2 font-medium">
                        <span className="text-white/50">Pack total</span>
                        <span className="text-brand-gold">{formatCurrency(pack.subtotal)}</span>
                      </div>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
