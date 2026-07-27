export type VisitorLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
  /** Visitor's public IP address (exact network identity) */
  ip: string | null;
  /** How the location was resolved — for debugging / admin confidence */
  source?: 'ip' | null;
};

const CACHE_KEY = 'ay-food-visitor-location-v4';
const EMPTY: VisitorLocation = {
  country: null,
  region: null,
  city: null,
  ip: null,
  source: null,
};

type Cached = VisitorLocation & { resolved: true };

function hasLocation(loc: VisitorLocation): boolean {
  return Boolean(loc.country || loc.region || loc.city || loc.ip);
}

function stripCache(cached: Cached): VisitorLocation {
  const { resolved: _r, ...loc } = cached;
  return loc;
}

function readCache(): Cached | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as Cached;
    if (parsed?.resolved && typeof parsed.ip === 'string' && parsed.ip) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(location: VisitorLocation) {
  try {
    const payload: Cached = { ...location, resolved: true };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function normalizeIp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ip = value.trim();
  if (!ip || ip.length > 64) return null;
  // Basic IPv4 / IPv6 sanity (avoid storing junk)
  if (!/^[\d.:a-fA-F]+$/.test(ip)) return null;
  return ip;
}

async function fetchJson(url: string, timeoutMs = 5000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`location failed (${res.status})`);
  return res.json();
}

/** Real public IP → city / region / country + the exact IP string. */
async function resolveFromIp(): Promise<VisitorLocation> {
  // 1) geojs — returns the visitor's public IP + geo
  try {
    const data = (await fetchJson('https://get.geojs.io/v1/ip/geo.json')) as {
      ip?: string;
      country?: string;
      region?: string;
      city?: string;
    };
    const location: VisitorLocation = {
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
      ip: normalizeIp(data.ip),
      source: 'ip',
    };
    if (hasLocation(location)) return location;
  } catch {
    // next
  }

  // 2) ipwho.is
  try {
    const data = (await fetchJson('https://ipwho.is/')) as {
      success?: boolean;
      ip?: string;
      country?: string;
      region?: string;
      city?: string;
    };
    if (data.success !== false) {
      const location: VisitorLocation = {
        country: data.country ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
        ip: normalizeIp(data.ip),
        source: 'ip',
      };
      if (hasLocation(location)) return location;
    }
  } catch {
    // next
  }

  // 3) ipapi.co
  try {
    const data = (await fetchJson('https://ipapi.co/json/')) as {
      error?: boolean;
      ip?: string;
      country_name?: string;
      region?: string;
      city?: string;
    };
    if (!data.error) {
      const location: VisitorLocation = {
        country: data.country_name ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
        ip: normalizeIp(data.ip),
        source: 'ip',
      };
      if (hasLocation(location)) return location;
    }
  } catch {
    // give up
  }

  return { ...EMPTY, source: 'ip' };
}

/**
 * Resolve the visitor’s public IP + approximate place for analytics.
 * Uses IP lookup only — never asks for GPS.
 */
export async function getVisitorLocation(): Promise<VisitorLocation> {
  const cached = readCache();

  if (cached?.resolved) {
    return stripCache(cached);
  }

  const ip = await resolveFromIp();
  writeCache(ip);
  return ip;
}

/** Display label for admin — IP first, then city / region / country. */
export function formatVisitorLocation(row: {
  ip_address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const place = [row.city, row.region, row.country].filter(Boolean).join(', ');
  const ip = row.ip_address?.trim();
  if (ip && place) return `${ip} · ${place}`;
  if (ip) return ip;
  return place || 'Unknown';
}
