import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  clearOrdersInDatabase,
  confirmPaymentReceivedInDatabase,
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

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  RECEIVED: 'Order Received',
  PREPARING: 'Preparing',
  PACKING: 'Packing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      showToast('Order status updated successfully', 'success');
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not update order', 'error'),
  });

  const confirmPayment = useMutation({
    mutationFn: (id: string) => confirmPaymentReceivedInDatabase(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      showToast(
        result.alreadyCompleted
          ? 'Payment was already marked received'
          : result.emailed
            ? 'Payment received — confirmation email sent to customer'
            : 'Payment received (email could not be sent — check SMTP)',
        result.emailed || result.alreadyCompleted ? 'success' : 'error',
      );
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not confirm payment', 'error'),
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
            Live from database — confirm OPay payments, then update kitchen status
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
            No orders yet. When a customer confirms an OPay transfer, the order appears here as
            Awaiting payment.
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
                      {order.status.replaceAll('_', ' ')}
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

                  {!order.paymentPaid && (
                    <button
                      type="button"
                      disabled={confirmPayment.isPending}
                      onClick={() => confirmPayment.mutate(order.id)}
                      className="mb-3 w-full rounded-xl bg-brand-green/90 px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-green disabled:opacity-60"
                    >
                      {confirmPayment.isPending && confirmPayment.variables === order.id
                        ? 'Confirming…'
                        : 'Payment received'}
                    </button>
                  )}

                  <label className="mb-1 block text-xs text-white/50">Update kitchen / tracking status</label>
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
                        {STATUS_LABELS[s] ?? s.replaceAll('_', ' ')}
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
