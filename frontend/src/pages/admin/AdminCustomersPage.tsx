import { useQuery } from '@tanstack/react-query';
import { listCustomersFromDatabase } from '../../services/orders.service';
import { formatCurrency } from '../../utils/helpers';

function formatOrderTime(iso?: string) {
  if (!iso) return '—';
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

export default function AdminCustomersPage() {
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => listCustomersFromDatabase(),
    retry: 1,
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl font-bold">Customers</h1>
      <p className="mb-6 text-sm text-white/50">From database orders</p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error instanceof Error ? error.message : 'Could not load customers'}
        </p>
      )}

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-brand-dark-light p-8 text-center text-white/50">
          No customers yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand-dark-light text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.email} className="border-t border-white/5">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-white/60">
                    <div>{c.email}</div>
                    <div className="text-xs text-white/40">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3">{c.orders}</td>
                  <td className="px-4 py-3 text-brand-gold">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    {formatOrderTime(c.lastOrderAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
