import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  clearOrdersInDatabase,
  listOrdersFromDatabase,
  updateOrderStatusInDatabase,
} from '../../services/orders.service';
import type { AdminOrder, AdminOrderStatus } from '../../services/admin-store';
import { formatCurrency, cn } from '../../utils/helpers';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/admin/DeleteConfirmModal';

const STATUSES: AdminOrderStatus[] = [
  'RECEIVED',
  'PREPARING',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      showToast('Order status updated successfully', 'success');
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
            Live from database — updates when customers confirm payment
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
            No orders yet. When a customer taps “I have made payment”, the order appears here.
          </p>
        )}

        {orders.map((order: AdminOrder) => {
          const open = expandedId === order.id;
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
                        statusColor(order.status),
                      )}
                    >
                      {order.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-white/50">
                    {order.customerName} · {order.orderType} · {formatCurrency(order.total)}
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
                  </div>

                  <ul className="mb-4 space-y-2 text-sm">
                    {order.items?.map((item) => (
                      <li
                        key={item.id}
                        className="flex justify-between rounded-lg bg-brand-dark px-3 py-2"
                      >
                        <span>
                          {item.food?.name ?? 'Item'} ({item.portionName}) ×{item.quantity}
                          {item.packName ? ` · ${item.packName}` : ''}
                        </span>
                        <span className="text-brand-gold">{formatCurrency(item.totalPrice)}</span>
                      </li>
                    ))}
                  </ul>

                  <label className="mb-1 block text-xs text-white/50">Update status</label>
                  <select
                    value={order.status}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: order.id,
                        status: e.target.value as AdminOrderStatus,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-sm outline-none focus:border-brand-gold"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll('_', ' ')}
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
