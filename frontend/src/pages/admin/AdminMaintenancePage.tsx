import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  siteSettingsService,
} from '../../services/site-settings.service';
import { useToast } from '../../components/ui/Toast';
import { useState, useEffect } from 'react';

const LEGACY_MAINTENANCE_MESSAGE =
  'We are temporarily closed. Please check back soon.';

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsService.get(),
  });

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MAINTENANCE_MESSAGE);

  useEffect(() => {
    if (data) {
      setEnabled(data.maintenance_enabled);
      const existing = data.maintenance_message?.trim() || '';
      setMessage(
        !existing || existing === LEGACY_MAINTENANCE_MESSAGE
          ? DEFAULT_MAINTENANCE_MESSAGE
          : existing,
      );
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      siteSettingsService.update({
        maintenance_enabled: enabled,
        maintenance_message: message.trim() || DEFAULT_MAINTENANCE_MESSAGE,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      showToast(enabled ? 'Maintenance mode ON' : 'Maintenance mode OFF', 'success');
    },
    onError: () => showToast('Could not save settings', 'error'),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 font-display text-3xl font-bold">Maintenance</h1>
      <p className="mb-6 text-sm text-white/50">
        Pause the storefront when the kitchen is closed or you are updating the menu.
      </p>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-brand-dark-light p-6">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Maintenance mode</p>
            <p className="text-sm text-white/50">
              Customers see: “{DEFAULT_MAINTENANCE_MESSAGE}”
            </p>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              const on = e.target.checked;
              setEnabled(on);
              if (on) {
                const current = message.trim();
                if (!current || current === LEGACY_MAINTENANCE_MESSAGE) {
                  setMessage(DEFAULT_MAINTENANCE_MESSAGE);
                }
              }
            }}
            className="h-5 w-5"
          />
        </label>

        <div>
          <label className="mb-1 block text-sm text-white/60">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder={DEFAULT_MAINTENANCE_MESSAGE}
            className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
          />
        </div>

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
