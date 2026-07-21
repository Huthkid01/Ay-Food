import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, Users, AlertTriangle } from 'lucide-react';
import { adminApi } from '../services/api';
import { formatCurrency } from '../utils/helpers';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard().then((r) => r.data),
    retry: false,
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminApi.inventory().then((r) => r.data),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-dark-light" />
          ))}
        </div>
      </div>
    );
  }

  const analytics = data?.analytics;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 font-display text-4xl font-bold">
        Admin <span className="text-gradient">Dashboard</span>
      </h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Daily Sales', value: formatCurrency(analytics?.dailySales ?? 0), icon: BarChart3 },
          { label: 'Weekly Sales', value: formatCurrency(analytics?.weeklySales ?? 0), icon: BarChart3 },
          { label: 'Monthly Sales', value: formatCurrency(analytics?.monthlySales ?? 0), icon: BarChart3 },
          { label: 'Total Customers', value: analytics?.totalCustomers ?? 0, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
            <Icon className="mb-2 text-brand-gold" size={24} />
            <p className="text-sm text-white/60">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Package size={20} className="text-brand-gold" /> Recent Orders
          </h2>
          <div className="space-y-3">
            {(data?.recentOrders ?? []).slice(0, 5).map((order: { id: string; orderNumber: string; customerName: string; total: number; status: string }) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg bg-brand-dark p-3 text-sm">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-white/50">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-brand-gold">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-white/40">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
            <h2 className="mb-4 font-semibold">Popular Meals</h2>
            {(data?.popularMeals ?? []).map((meal: { id?: string; name?: string; totalSold?: number }) => (
              <div key={meal.id} className="flex justify-between py-2 text-sm border-b border-white/5 last:border-0">
                <span>{meal.name}</span>
                <span className="text-brand-gold">{meal.totalSold} sold</span>
              </div>
            ))}
          </div>

          {(inventoryData?.lowStock ?? []).length > 0 && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-yellow-400">
                <AlertTriangle size={18} /> Low Stock Alerts
              </h2>
              {inventoryData.lowStock.map((item: { id: string; name: string; quantity: number; unit: string }) => (
                <p key={item.id} className="text-sm text-yellow-200/80">
                  {item.name}: {item.quantity} {item.unit} remaining
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
