import { useQuery } from '@tanstack/react-query';
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  siteSettingsService,
} from '../../services/site-settings.service';
import { useSiteContentData } from '../../hooks/useSiteContent';
import { brandDisplayName } from '../../data/default-site-content';

/** Full-screen notice when admin turns on maintenance mode. */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const content = useSiteContentData();
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsService.get(),
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  if (data?.maintenance_enabled) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="max-w-lg rounded-2xl border border-brand-gold/30 bg-brand-dark-light p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
            Closed today
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold">
            {brandDisplayName(content.restaurant)}
          </h1>
          <p className="mt-4 text-white/70">
            {data.maintenance_message?.trim() || DEFAULT_MAINTENANCE_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
