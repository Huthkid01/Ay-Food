import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_MAINTENANCE_MESSAGE,
  siteSettingsService,
} from '../../services/site-settings.service';
import { useToast } from '../../components/ui/Toast';
import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/helpers';
import {
  DEFAULT_DELIVERY_RULES,
  normalizeDeliveryRules,
  type DeliveryBand,
} from '../../utils/delivery-fee';

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
  const [originLabel, setOriginLabel] = useState(DEFAULT_DELIVERY_RULES.origin.label);
  const [originLat, setOriginLat] = useState(String(DEFAULT_DELIVERY_RULES.origin.lat));
  const [originLon, setOriginLon] = useState(String(DEFAULT_DELIVERY_RULES.origin.lon));
  const [bands, setBands] = useState<DeliveryBand[]>(DEFAULT_DELIVERY_RULES.bands);
  const [specialOrderMinKm, setSpecialOrderMinKm] = useState(
    String(DEFAULT_DELIVERY_RULES.specialOrderMinKm),
  );
  const [specialOrderNote, setSpecialOrderNote] = useState(DEFAULT_DELIVERY_RULES.specialOrderNote);

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
      const rules = normalizeDeliveryRules(data.delivery_rules);
      setOriginLabel(rules.origin.label);
      setOriginLat(String(rules.origin.lat));
      setOriginLon(String(rules.origin.lon));
      setBands(rules.bands);
      setSpecialOrderMinKm(String(rules.specialOrderMinKm));
      setSpecialOrderNote(rules.specialOrderNote);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const fee = Number(deliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        throw new Error('Enter a valid delivery fee (0 or more)');
      }
      const lat = Number(originLat);
      const lon = Number(originLon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error('Origin coordinates must be valid numbers');
      }
      if (bands.length === 0) throw new Error('Add at least one distance band');
      const normalizedBands = [...bands]
        .map((b) => ({
          minKm: Number(b.minKm),
          maxKm: Number(b.maxKm),
          fee: Math.round(Number(b.fee)),
          requiresConfirm: Boolean(b.requiresConfirm),
        }))
        .sort((a, b) => a.minKm - b.minKm);
      for (let i = 0; i < normalizedBands.length; i += 1) {
        const b = normalizedBands[i];
        if (!Number.isFinite(b.minKm) || !Number.isFinite(b.maxKm) || !Number.isFinite(b.fee)) {
          throw new Error('Each band must have valid km and fee values');
        }
        if (b.minKm < 0 || b.maxKm <= b.minKm) {
          throw new Error('Each band must have max km greater than min km');
        }
        if (b.fee < 0) throw new Error('Band fee cannot be negative');
      }
      const specialKm = Number(specialOrderMinKm);
      if (!Number.isFinite(specialKm) || specialKm <= 0) {
        throw new Error('Special-order threshold must be above 0 km');
      }
      return siteSettingsService.update({
        maintenance_enabled: enabled,
        maintenance_message: message.trim() || DEFAULT_MAINTENANCE_MESSAGE,
        // Keep fallback fee in sync with the first band for cart preview
        delivery_fee: Math.round(normalizedBands[0]?.fee ?? fee),
        delivery_rules: {
          origin: {
            label: originLabel.trim() || DEFAULT_DELIVERY_RULES.origin.label,
            lat,
            lon,
          },
          bands: normalizedBands,
          specialOrderMinKm: specialKm,
          specialOrderNote:
            specialOrderNote.trim() || DEFAULT_DELIVERY_RULES.specialOrderNote,
        },
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      showToast(
        enabled
          ? 'Settings saved — maintenance ON'
          : `Settings saved — delivery starts at ${formatCurrency(saved.delivery_fee)}`,
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
        Distance delivery rules and maintenance mode.
      </p>

      <div className="space-y-5 rounded-2xl border border-white/10 bg-brand-dark-light p-6">
        <div>
          <label className="mb-1 block text-sm text-white/60" htmlFor="delivery-fee">
            Fallback delivery fee (₦)
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
            Used when customer types an address without using GPS. Pickup stays free.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 p-4">
          <p className="text-sm font-medium text-white">Delivery distance rules</p>
          <p className="text-xs text-white/45">
            Checkout uses distance from this origin (GPS) to customer location.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={originLabel}
              onChange={(e) => setOriginLabel(e.target.value)}
              placeholder="Origin label"
              className="rounded-xl border border-white/10 bg-brand-dark px-3 py-2.5 text-sm outline-none focus:border-brand-gold sm:col-span-3"
            />
            <input
              value={originLat}
              onChange={(e) => setOriginLat(e.target.value)}
              placeholder="Latitude"
              className="rounded-xl border border-white/10 bg-brand-dark px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
            />
            <input
              value={originLon}
              onChange={(e) => setOriginLon(e.target.value)}
              placeholder="Longitude"
              className="rounded-xl border border-white/10 bg-brand-dark px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
            />
          </div>
          <div className="space-y-2">
            {bands.map((band, idx) => (
              <div key={`${band.minKm}-${idx}`} className="grid grid-cols-12 gap-2">
                <input
                  value={String(band.minKm)}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) =>
                        i === idx ? { ...b, minKm: Number(e.target.value) || 0 } : b,
                      ),
                    )
                  }
                  placeholder="Min km"
                  className="col-span-3 rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-sm outline-none focus:border-brand-gold"
                />
                <input
                  value={String(band.maxKm)}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) =>
                        i === idx ? { ...b, maxKm: Number(e.target.value) || 0 } : b,
                      ),
                    )
                  }
                  placeholder="Max km"
                  className="col-span-3 rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-sm outline-none focus:border-brand-gold"
                />
                <input
                  value={String(band.fee)}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) =>
                        i === idx ? { ...b, fee: Number(e.target.value) || 0 } : b,
                      ),
                    )
                  }
                  placeholder="Fee ₦"
                  className="col-span-4 rounded-xl border border-white/10 bg-brand-dark px-3 py-2 text-sm outline-none focus:border-brand-gold"
                />
                <label className="col-span-2 flex items-center justify-center gap-1 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={Boolean(band.requiresConfirm)}
                    onChange={(e) =>
                      setBands((prev) =>
                        prev.map((b, i) =>
                          i === idx ? { ...b, requiresConfirm: e.target.checked } : b,
                        ),
                      )
                    }
                  />
                  Confirm
                </label>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={specialOrderMinKm}
              onChange={(e) => setSpecialOrderMinKm(e.target.value)}
              placeholder="Special order after km"
              className="rounded-xl border border-white/10 bg-brand-dark px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
            />
            <input
              value={specialOrderNote}
              onChange={(e) => setSpecialOrderNote(e.target.value)}
              placeholder="Special order note"
              className="rounded-xl border border-white/10 bg-brand-dark px-3 py-2.5 text-sm outline-none focus:border-brand-gold"
            />
          </div>
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
