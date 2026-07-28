export type DeliveryBand = {
  minKm: number;
  maxKm: number;
  fee: number;
  requiresConfirm?: boolean;
};

export type DeliveryRules = {
  origin: {
    label: string;
    lat: number;
    lon: number;
  };
  bands: DeliveryBand[];
  specialOrderMinKm: number;
  specialOrderNote: string;
};

export const DEFAULT_DELIVERY_RULES: DeliveryRules = {
  origin: {
    label: 'Omoleye bustop, Ogijo',
    lat: 6.6977251,
    lon: 3.5119394,
  },
  bands: [
    { minKm: 0, maxKm: 2.5, fee: 1200 },
    { minKm: 2.5, maxKm: 5, fee: 1500 },
    { minKm: 5, maxKm: 8, fee: 2000 },
    { minKm: 8, maxKm: 12, fee: 2800 },
    { minKm: 12, maxKm: 18, fee: 4000, requiresConfirm: true },
  ],
  specialOrderMinKm: 18,
  specialOrderNote:
    'Special delivery only. Please call or WhatsApp us to confirm delivery fee before payment.',
};

export type DeliveryFeeResult = {
  distanceKm: number;
  fee: number;
  requiresConfirm: boolean;
  manualQuoteOnly: boolean;
  note?: string;
};

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineKm(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const earthKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthKm * c;
}

export function normalizeDeliveryRules(raw: unknown): DeliveryRules {
  const fallback = DEFAULT_DELIVERY_RULES;
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  const originRaw = (obj.origin ?? {}) as Record<string, unknown>;
  const bandsRaw = Array.isArray(obj.bands) ? obj.bands : fallback.bands;

  const bands: DeliveryBand[] = [];
  for (const item of bandsRaw) {
    if (!item || typeof item !== 'object') continue;
    const band = item as Record<string, unknown>;
    const minKm = Number(band.minKm);
    const maxKm = Number(band.maxKm);
    const fee = Math.round(Number(band.fee));
    if (!Number.isFinite(minKm) || !Number.isFinite(maxKm) || !Number.isFinite(fee)) continue;
    if (minKm < 0 || maxKm <= minKm || fee < 0) continue;
    bands.push({
      minKm,
      maxKm,
      fee,
      requiresConfirm: Boolean(band.requiresConfirm),
    });
  }
  bands.sort((a, b) => a.minKm - b.minKm);

  return {
    origin: {
      label:
        typeof originRaw.label === 'string' && originRaw.label.trim()
          ? originRaw.label.trim()
          : fallback.origin.label,
      lat: Number.isFinite(Number(originRaw.lat)) ? Number(originRaw.lat) : fallback.origin.lat,
      lon: Number.isFinite(Number(originRaw.lon)) ? Number(originRaw.lon) : fallback.origin.lon,
    },
    bands: bands.length > 0 ? bands : fallback.bands,
    specialOrderMinKm: Number.isFinite(Number(obj.specialOrderMinKm))
      ? Number(obj.specialOrderMinKm)
      : fallback.specialOrderMinKm,
    specialOrderNote:
      typeof obj.specialOrderNote === 'string' && obj.specialOrderNote.trim()
        ? obj.specialOrderNote.trim()
        : fallback.specialOrderNote,
  };
}

export function computeDeliveryFee(
  rules: DeliveryRules,
  customerLat: number,
  customerLon: number,
): DeliveryFeeResult {
  const distanceKm = haversineKm(rules.origin.lat, rules.origin.lon, customerLat, customerLon);
  if (distanceKm > rules.specialOrderMinKm) {
    return {
      distanceKm,
      fee: 0,
      requiresConfirm: true,
      manualQuoteOnly: true,
      note: rules.specialOrderNote,
    };
  }
  const band =
    rules.bands.find((b) => distanceKm >= b.minKm && distanceKm <= b.maxKm) ??
    rules.bands[rules.bands.length - 1];
  return {
    distanceKm,
    fee: band?.fee ?? 0,
    requiresConfirm: Boolean(band?.requiresConfirm),
    manualQuoteOnly: false,
  };
}
