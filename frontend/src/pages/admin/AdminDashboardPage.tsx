import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, Users, ShoppingBag, Eye, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getOrderStatsFromDatabase,
  listOrdersFromDatabase,
} from '../../services/orders.service';
import { siteVisitService, SITE_ACTIVE_WINDOW_MINUTES } from '../../services/site-visit.service';
import { formatCurrency } from '../../utils/helpers';

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [stats, recentOrders] = await Promise.all([
        getOrderStatsFromDatabase(),
        listOrdersFromDatabase(8),
      ]);
      return {
        analytics: {
          dailySales: stats.todayRevenue,
          weeklySales: stats.weekRevenue,
          monthlySales: stats.monthRevenue,
          dailyOrders: stats.todayOrders,
          totalCustomers: stats.totalCustomers,
        },
        recentOrders,
      };
    },
    retry: 1,
    refetchInterval: 15_000,
  });

  const { data: visitorStats } = useQuery({
    queryKey: ['admin-visitor-stats'],
    queryFn: () => siteVisitService.getStats(),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-brand-dark-light" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="font-display text-2xl font-bold">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-white/70">
          {error instanceof Error ? error.message : 'Please sign in again.'}
        </p>
      </div>
    );
  }

  const analytics = data?.analytics;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Dashboard Overview</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold"
          >
            <BarChart3 size={16} /> Analytics
          </Link>
          <Link
            to="/admin/visitors"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold"
          >
            <Eye size={16} /> Site visits
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-4 py-2 text-sm font-semibold text-white"
          >
            <ShoppingBag size={16} /> View orders
          </Link>
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'On site now',
            value: visitorStats?.activeVisitors ?? 0,
            icon: Eye,
            hint: `Last ${SITE_ACTIVE_WINDOW_MINUTES} min`,
            to: '/admin/visitors',
          },
          {
            label: 'Visits today',
            value: visitorStats?.visitsToday ?? 0,
            icon: Activity,
            to: '/admin/visitors',
          },
          {
            label: 'Daily Sales',
            value: formatCurrency(analytics?.dailySales ?? 0),
            icon: BarChart3,
            to: '/admin/analytics',
          },
          {
            label: 'Customers',
            value: analytics?.totalCustomers ?? 0,
            icon: Users,
            to: '/admin/customers',
          },
        ].map(({ label, value, icon: Icon, hint, to }) => {
          const inner = (
            <>
              <Icon className="mb-2 text-brand-gold" size={22} />
              <p className="text-sm text-white/60">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
            </>
          );
          return to ? (
            <Link
              key={label}
              to={to}
              className="rounded-2xl border border-white/10 bg-brand-dark-light p-5 transition hover:border-brand-gold/40"
            >
              {inner}
            </Link>
          ) : (
            <div key={label} className="rounded-2xl border border-white/10 bg-brand-dark-light p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Weekly Sales', value: formatCurrency(analytics?.weeklySales ?? 0), icon: BarChart3 },
          { label: 'Monthly Sales', value: formatCurrency(analytics?.monthlySales ?? 0), icon: BarChart3 },
          {
            label: 'Daily Orders',
            value: analytics?.dailyOrders ?? 0,
            icon: Package,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-brand-dark-light p-5">
            <Icon className="mb-2 text-brand-gold" size={22} />
            <p className="text-sm text-white/60">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Package size={20} className="text-brand-gold" /> Recent Orders
        </h2>
        <div className="space-y-3">
          {(data?.recentOrders ?? []).map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-xl bg-brand-dark p-3 text-sm"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-white/50">{order.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-brand-gold">{formatCurrency(order.total)}</p>
                <p className="text-xs text-white/40">
                  {order.paymentPaid ? 'Paid' : 'Awaiting payment'} ·{' '}
                  {order.status.replaceAll('_', ' ')}
                </p>
              </div>
            </div>
          ))}
          {!data?.recentOrders?.length && (
            <p className="text-sm text-white/40">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
