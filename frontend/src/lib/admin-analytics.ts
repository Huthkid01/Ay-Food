import type { AdminOrder, AdminOrderStatus } from '../services/admin-store';

export type AnalyticsBar = { label: string; value: number };

export type AdminAnalyticsSnapshot = {
  peakWeeklyRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  visitsToday: number;
  revenueByWeek: AnalyticsBar[];
  orderStatusBreakdown: AnalyticsBar[];
  orderTypeBreakdown: AnalyticsBar[];
  topDishes: AnalyticsBar[];
};

const STATUS_LABELS: Record<AdminOrderStatus, string> = {
  RECEIVED: 'Received',
  PREPARING: 'Preparing',
  PACKING: 'Packing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function buildRevenueWeekBuckets() {
  const buckets: Array<{ label: string; start: Date; end: Date }> = [];
  for (let weekIndex = 3; weekIndex >= 0; weekIndex -= 1) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - weekIndex * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const label = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    buckets.push({ label, start, end });
  }
  return buckets;
}

function isCountable(order: AdminOrder) {
  return order.status !== 'CANCELLED';
}

export function buildAdminAnalyticsSnapshot(
  orders: AdminOrder[],
  visitsToday: number,
): AdminAnalyticsSnapshot {
  const countable = orders.filter(isCountable);

  const revenueByWeek = buildRevenueWeekBuckets().map(({ label, start, end }) => {
    const value = countable
      .filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .reduce((sum, o) => sum + o.total, 0);
    return { label, value };
  });

  const peakWeeklyRevenue = Math.max(0, ...revenueByWeek.map((w) => w.value));

  const statusMap = new Map<string, number>();
  for (const order of orders) {
    const label = STATUS_LABELS[order.status] ?? order.status;
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const orderStatusBreakdown = [...statusMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const typeMap = new Map<string, number>();
  for (const order of countable) {
    const label = order.orderType === 'PICKUP' ? 'Pickup' : 'Delivery';
    typeMap.set(label, (typeMap.get(label) ?? 0) + 1);
  }
  const orderTypeBreakdown = [...typeMap.entries()].map(([label, value]) => ({ label, value }));

  const dishMap = new Map<string, number>();
  for (const order of countable) {
    for (const item of order.items) {
      const name = item.food?.name ?? 'Item';
      dishMap.set(name, (dishMap.get(name) ?? 0) + item.quantity);
    }
  }
  const topDishes = [...dishMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return {
    peakWeeklyRevenue,
    totalRevenue: countable.reduce((s, o) => s + o.total, 0),
    totalOrders: countable.length,
    visitsToday,
    revenueByWeek,
    orderStatusBreakdown,
    orderTypeBreakdown,
    topDishes,
  };
}
