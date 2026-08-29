import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  clearOrdersInDatabase,
  listOrdersFromDatabase,
  notifyOrderStatusInDatabase,
  updateOrderStatusInDatabase,
} from '../../services/orders.service';
import type { AdminOrder, AdminOrderStatus } from '../../services/admin-store';
import { formatCurrency, cn } from '../../utils/helpers';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { normalizePackName, comparePackNames } from '../../utils/pack-groups';

/** Kitchen / delivery tracking — payment is auto-confirmed via Kora (Paid badge). */
const KITCHEN_STATUSES: AdminOrderStatus[] = [
  'PREPARING',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  RECEIVED: 'Order Received',
  PREPARING: 'Preparing',
  PACKING: 'Packing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function kitchenStatusLabel(status: AdminOrderStatus) {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

function formatOrderTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'DELIVERED':
      return 'bg-brand-green/20 text-brand-green';
    case 'CANCELLED':
      return 'bg-red-500/20 text-red-300';
    case 'OUT_FOR_DELIVERY':
      return 'bg-blue-500/20 text-blue-300';
    case 'RECEIVED':
      return 'bg-white/10 text-white/70';
    default:
      return 'bg-brand-gold/20 text-brand-gold';
  }
}

function paymentLabel(order: AdminOrder) {
  if (order.paymentPaid) return 'Paid';
  if (order.paymentStatus === 'PROCESSING' || order.paymentStatus === 'PENDING') {
    return 'Awaiting payment';
  }
  if (order.paymentStatus === 'FAILED') return 'Payment failed';
  if (order.paymentStatus === 'REFUNDED') return 'Refunded';
  return 'Unpaid';
}

function paymentColor(order: AdminOrder) {
  if (order.paymentPaid) return 'bg-brand-green/20 text-brand-green';
  if (order.paymentStatus === 'FAILED') return 'bg-red-500/20 text-red-300';
  if (order.paymentStatus === 'REFUNDED') return 'bg-white/10 text-white/50';
  return 'bg-amber-500/20 text-amber-200';
}

function paymentProviderLabel(provider?: string) {
  if (!provider) return null;
  const value = provider.toUpperCase();
  if (value === 'KORA') return 'Kora';
  if (value === 'BANK_TRANSFER' || value === 'OPAY') return 'OPay';
  if (value === 'CASH') return 'Cash';
  return provider;
}

export default function AdminOrdersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => listOrdersFromDatabase(150),
    retry: 1,
    refetchInterval: 8_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminOrderStatus }) =>
      updateOrderStatusInDatabase(id, status),
    onSuccess: (_updatedOrder, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      if (status === 'OUT_FOR_DELIVERY') {
        showToast('Order marked out for delivery — notifying customer by email', 'success');
        void notifyOrderStatusInDatabase(id, status);
      } else {
        showToast('Order status updated successfully', 'success');
      }
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not update order', 'error'),
  });

  const clearOrders = useMutation({
    mutationFn: () => clearOrdersInDatabase(),
    onSuccess: (result) => {
      setConfirmClear(false);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      showToast(
        result.deletedOrders
          ? `Cleared ${result.deletedOrders} orders`
          : 'Orders cleared',
        'success',
      );
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not clear orders', 'error'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-brand-dark-light" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-white/50">
            Live from database — Kora payments show as Paid automatically; update kitchen status below
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={clearOrders.isPending || orders.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 size={16} /> Clear orders
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error instanceof Error ? error.message : 'Could not load orders from database'}
        </p>
      )}

      <div className="space-y-3">
        {orders.length === 0 && !error && (
          <p className="rounded-2xl border border-white/10 bg-brand-dark-light p-8 text-center text-white/50">
            No orders yet. When a customer pays with Kora, the order appears here as Paid.
          </p>
        )}

        {orders.map((order: AdminOrder) => {
          const open = expandedId === order.id;
          const payProvider = paymentProviderLabel(order.paymentProvider);
          return (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-light"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-left"
                onClick={() => setExpandedId(open ? null : order.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{order.orderNumber}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        paymentColor(order),
                      )}
                    >
                      {paymentLabel(order)}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        statusColor(order.status),
                      )}
                    >
                      {kitchenStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/50">
                    {order.customerName} · {order.orderType} · {formatCurrency(order.total)}
                    {payProvider ? ` · ${payProvider}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-white/35">{formatOrderTime(order.createdAt)}</p>
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {open && (
                <div className="border-t border-white/10 px-4 pt-3 pb-4">
                  <div className="mb-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
                    <p>Phone: {order.customerPhone}</p>
                    <p>Email: {order.customerEmail}</p>
                    {order.deliveryAddress && (
                      <p className="sm:col-span-2">Address: {order.deliveryAddress}</p>
                    )}
                    <p>
                      Payment:{' '}
                      <span className={order.paymentPaid ? 'text-brand-green' : 'text-amber-200'}>
                        {paymentLabel(order)}
                      </span>
                      {payProvider ? ` (${payProvider})` : ''}
                    </p>
                    {order.paymentAmount != null && (
                      <p>Charged: {formatCurrency(order.paymentAmount)}</p>
                    )}
                    {order.paymentReference && (
                      <p className="sm:col-span-2 break-all text-xs text-white/45">
                        Ref: {order.paymentReference}
                      </p>
                    )}
                  </div>

                  {(() => {
                    const items = order.items ?? [];
                    const packMap = new Map<string, typeof items>();
                    for (const item of items) {
                      const pack = normalizePackName(item.packName);
                      if (!packMap.has(pack)) packMap.set(pack, []);
                      packMap.get(pack)!.push(item);
                    }
                    const packs = [...packMap.keys()].sort(comparePackNames);
                    const packCount = packs.filter((p) => /^pack\s*\d+$/i.test(p)).length;
                    const PACK_FEE = 300;
                    const packFeeTotal = packCount * PACK_FEE;
                    const foodSubtotal = items.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
                    return (
                      <div className="mb-4 space-y-3 text-sm">
                        {packs.map((packName) => (
                          <div key={packName} className="rounded-xl border border-white/10 bg-brand-dark overflow-hidden">
                            <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-gold/80 border-b border-white/10">
                              {packName}
                            </div>
                            <ul className="divide-y divide-white/5">
                              {packMap.get(packName)!.map((item) => (
                                <li key={item.id} className="flex justify-between px-3 py-2">
                                  <span className="text-white/80">
                                    {item.food?.name ?? 'Item'} ({item.portionName}) ×{item.quantity}
                                  </span>
                                  <span className="text-brand-gold">{formatCurrency(item.totalPrice)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}

                        {/* Fee breakdown */}
                        <div className="rounded-xl border border-white/10 bg-brand-dark divide-y divide-white/5 text-sm">
                          <div className="flex justify-between px-3 py-2 text-white/60">
                            <span>Food subtotal</span>
                            <span>{formatCurrency(foodSubtotal)}</span>
                          </div>
                          {packFeeTotal > 0 && (
                            <div className="flex justify-between px-3 py-2 text-white/60">
                              <span>Pack fee ({packCount} × ₦{PACK_FEE})</span>
                              <span>{formatCurrency(packFeeTotal)}</span>
                            </div>
                          )}
                          {order.orderType === 'DELIVERY' && (
                            <div className="flex justify-between px-3 py-2 text-white/60">
                              <span>Delivery fee</span>
                              <span>{formatCurrency(order.deliveryFee ?? 0)}</span>
                            </div>
                          )}
                          {(order.discount ?? 0) > 0 && (
                            <div className="flex justify-between px-3 py-2 text-brand-green/80">
                              <span>Discount</span>
                              <span>−{formatCurrency(order.discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between px-3 py-2.5 font-semibold text-white">
                            <span>Total</span>
                            <span className="text-brand-gold">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <label className="mb-1 block text-xs text-white/50">
                    Update kitchen / tracking status
                  </label>
                  {order.status === 'RECEIVED' && order.paymentPaid && (
                    <p className="mb-2 text-xs text-brand-green/90">
                      Payment confirmed — order received. Choose the next kitchen step below.
                    </p>
                  )}
                  <select
                    value={order.status === 'RECEIVED' ? '' : order.status}
                    onChange={(e) => {
                      const next = e.target.value as AdminOrderStatus;
                      if (!next) return;
                      updateStatus.mutate({ id: order.id, status: next });
                    }}
                    className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-sm outline-none focus:border-brand-gold"
                  >
                    {order.status === 'RECEIVED' && (
                      <option value="">Order Received (paid) — select next step</option>
                    )}
                    {(order.status === 'RECEIVED'
                      ? KITCHEN_STATUSES
                      : [order.status as AdminOrderStatus, ...KITCHEN_STATUSES].filter(
                          (s, i, arr) => arr.indexOf(s) === i && s !== 'RECEIVED',
                        )
                    ).map((s) => (
                      <option key={s} value={s}>
                        {kitchenStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Clear all orders?"
        message="This permanently deletes every order from the database. Customers list will empty too. This cannot be undone."
        confirmLabel="Yes, clear orders"
        loading={clearOrders.isPending}
        onConfirm={() => clearOrders.mutate()}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
