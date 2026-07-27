import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_MAINTENANCE_MESSAGE,
  siteSettingsService,
} from '../../services/site-settings.service';
import { useToast } from '../../components/ui/Toast';
import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';

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
  const [deliveryFee, setDeliveryFee] = useState(String(DEFAULT_DELIVERY_FEE));

  useEffect(() => {
    if (data) {
      setEnabled(data.maintenance_enabled);
      const existing = data.maintenance_message?.trim() || '';
      setMessage(
        !existing || existing === LEGACY_MAINTENANCE_MESSAGE
          ? DEFAULT_MAINTENANCE_MESSAGE
          : existing,
      );
      setDeliveryFee(String(data.delivery_fee ?? DEFAULT_DELIVERY_FEE));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const fee = Number(deliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        throw new Error('Enter a valid delivery fee (0 or more)');
      }
      return siteSettingsService.update({
        maintenance_enabled: enabled,
        maintenance_message: message.trim() || DEFAULT_MAINTENANCE_MESSAGE,
        delivery_fee: Math.round(fee),
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      showToast(
        enabled
          ? 'Settings saved — maintenance ON'
          : `Settings saved — delivery ${formatCurrency(saved.delivery_fee)}`,
        'success',
      );
    },
    onError: (err) =>
      showToast(err instanceof Error ? err.message : 'Could not save settings', 'error'),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-brand-dark-light" />;
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 font-display text-3xl font-bold">Store settings</h1>
      <p className="mb-6 text-sm text-white/50">
        Delivery fee for checkout, and maintenance mode when the kitchen is closed.
      </p>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-brand-dark-light p-6">
        <div>
          <label className="mb-1 block text-sm text-white/60" htmlFor="delivery-fee">
            Delivery fee (₦)
          </label>
          <input
            id="delivery-fee"
            type="number"
            min={0}
            step={50}
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-brand-dark px-4 py-3 outline-none focus:border-brand-gold"
          />
          <p className="mt-1.5 text-xs text-white/45">
            Charged when the customer chooses Delivery. Pickup stays free.
          </p>
        </div>

        <label className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
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
          <label className="mb-1 block text-sm text-white/60">Maintenance message</label>
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
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
