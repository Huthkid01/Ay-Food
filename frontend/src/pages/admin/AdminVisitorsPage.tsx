import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Eye, MapPin, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import {
  SITE_ACTIVE_WINDOW_MINUTES,
  siteVisitService,
} from '../../services/site-visit.service';
import { formatVisitorLocation } from '../../lib/visitor-location';
import { useToast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/admin/DeleteConfirmModal';

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminVisitorsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-visitor-stats'],
    queryFn: () => siteVisitService.getStats(),
    refetchInterval: 15_000,
  });

  const { data: active = [], isLoading: activeLoading } = useQuery({
    queryKey: ['admin-active-sessions'],
    queryFn: () => siteVisitService.getActiveSessions(),
    refetchInterval: 15_000,
  });

  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: ['admin-recent-visits'],
    queryFn: () => siteVisitService.getRecentPageViews(80),
    refetchInterval: 20_000,
  });

  const clear = useMutation({
    mutationFn: () => siteVisitService.clearAll(),
    onSuccess: () => {
      setConfirmClear(false);
      queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      showToast('Visit history cleared');
    },
    onError: () => showToast('Could not clear visits'),
  });

  if (statsError) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="font-display text-2xl font-bold">Could not load visits</h1>
        <p className="mt-2 text-sm text-white/70">
          {statsError instanceof Error ? statsError.message : 'Please sign in again.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Site Visits</h1>
          <p className="mt-1 text-sm text-white/50">
            Live traffic · on site now = active in the last {SITE_ACTIVE_WINDOW_MINUTES} minutes.
            IP is the visitor’s real public network address. City/region comes from that IP
            (cross-checked across GeoIP providers) — not GPS street address.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmClear(true)}
          disabled={clear.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 size={16} /> Clear visits
        </button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'On site now',
            value: statsLoading ? '…' : stats?.activeVisitors ?? 0,
            icon: Users,
            hint: `${SITE_ACTIVE_WINDOW_MINUTES} min window`,
          },
          {
            label: 'Guests online',
            value: statsLoading ? '…' : stats?.activeGuests ?? 0,
            icon: Eye,
          },
          {
            label: 'Visits today',
            value: statsLoading ? '…' : stats?.visitsToday ?? 0,
            icon: Activity,
          },
          {
            label: 'Total sessions',
            value: statsLoading ? '…' : stats?.totalSessions ?? 0,
            icon: MapPin,
          },
        ].map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-brand-dark-light p-5">
            <Icon className="mb-2 text-brand-gold" size={22} />
            <p className="text-sm text-white/60">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {hint && <p className="mt-1 text-xs text-white/35">{hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">People currently on the site</h2>
          {activeLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-brand-dark" />
          ) : active.length === 0 ? (
            <p className="text-sm text-white/40">No one active right now.</p>
          ) : (
            <ul className="max-h-[420px] space-y-3 overflow-y-auto">
              {active.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/5 bg-brand-dark px-3 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {s.visitor_type === 'guest' ? 'Guest' : 'Registered'}
                        <span className="ml-2 text-xs text-brand-green">● live</span>
                      </p>
                      <p className="truncate text-white/50">{s.last_path}</p>
                      {s.ip_address ? (
                        <p className="mt-1 font-mono text-xs text-brand-gold">{s.ip_address}</p>
                      ) : null}
                      <p className="mt-1 flex items-center gap-1 text-xs text-white/35">
                        <MapPin size={12} />{' '}
                        {[s.city, s.region, s.country].filter(Boolean).join(', ') || 'Location unknown'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-white/40">
                      <p>{relativeTime(s.last_seen_at)}</p>
                      <p>{s.page_views} views</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-brand-dark-light p-6">
          <h2 className="mb-4 font-semibold">Recent page visits</h2>
          {recentLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-brand-dark" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-white/40">No visits recorded yet.</p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto text-sm">
              {recent.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{v.path}</p>
                    {v.ip_address ? (
                      <p className="truncate font-mono text-xs text-brand-gold">{v.ip_address}</p>
                    ) : null}
                    <p className="truncate text-xs text-white/40">
                      {[v.city, v.region, v.country].filter(Boolean).join(', ') ||
                        formatVisitorLocation(v)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-white/40">{relativeTime(v.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmClear}
        title="Clear visit history?"
        message="This wipes all site visit sessions and page views so traffic stats start fresh."
        confirmLabel="Yes, clear visits"
        loading={clear.isPending}
        onConfirm={() => clear.mutate()}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
