import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, TrendingUp, Eye, Truck } from 'lucide-react';
import { listOrdersFromDatabase } from '../../services/orders.service';
import { siteVisitService } from '../../services/site-visit.service';
import { buildAdminAnalyticsSnapshot } from '../../lib/admin-analytics';
import { formatCurrency } from '../../utils/helpers';

function BarRow({ label, value, max, format }: { label: string; value: number; max: number; format?: (n: number) => string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate pr-3 text-white/70">{label}</span>
        <span className="shrink-0 font-medium">{format ? format(value) : value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-brand-gold" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [orders, visitStats] = await Promise.all([
        listOrdersFromDatabase(500),
        siteVisitService.getStats(),
      ]);
      return buildAdminAnalyticsSnapshot(orders, visitStats.visitsToday);
    },
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-brand-dark-light" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="font-display text-2xl font-bold">Analytics unavailable</h1>
        <p className="mt-2 text-sm text-white/70">
          {error instanceof Error ? error.message : 'Please sign in again.'}
        </p>
      </div>
    );
  }

  const peak = Math.max(data.peakWeeklyRevenue, 1);
  const topDishMax = Math.max(1, ...data.topDishes.map((d) => d.value));
  const statusMax = Math.max(1, ...data.orderStatusBreakdown.map((d) => d.value));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-white/50">
          Live overview of sales, order mix, top dishes, and visits
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Peak weekly revenue', value: formatCurrency(data.peakWeeklyRevenue), icon: TrendingUp },
          { label: 'Total revenue', value: formatCurrency(data.totalRevenue), icon: BarChart3 },
          { label: 'Orders (excl. cancelled)', value: data.totalOrders, icon: Package },
          { label: 'Visits today', value: data.visitsToday, icon: Eye },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-brand-dark-light p-5">
            <Icon className="mb-2 text-brand-gold" size={22} />
            <p className="text-sm text-white/60">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">Revenue by week</h2>
          <div className="space-y-4">
            {data.revenueByWeek.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.value}
                max={peak}
                format={formatCurrency}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Truck size={18} className="text-brand-gold" /> Order type
          </h2>
          <div className="space-y-3">
            {data.orderTypeBreakdown.length ? (
              data.orderTypeBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl bg-brand-dark px-4 py-3 text-sm"
                >
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/40">No orders yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">Order status mix</h2>
          <div className="space-y-4">
            {data.orderStatusBreakdown.length ? (
              data.orderStatusBreakdown.map((item) => (
                <BarRow key={item.label} label={item.label} value={item.value} max={statusMax} />
              ))
            ) : (
              <p className="text-sm text-white/40">No orders yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">Top dishes</h2>
          <div className="space-y-4">
            {data.topDishes.length ? (
              data.topDishes.map((item) => (
                <BarRow key={item.label} label={item.label} value={item.value} max={topDishMax} />
              ))
            ) : (
              <p className="text-sm text-white/40">No dish sales yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
