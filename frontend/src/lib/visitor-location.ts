export type VisitorLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
  /** How the location was resolved — for debugging / admin confidence */
  source?: 'gps' | 'ip' | null;
};

const CACHE_KEY = 'ay-food-visitor-location-v3';
const EMPTY: VisitorLocation = { country: null, region: null, city: null, source: null };

type Cached = VisitorLocation & { resolved: true };

function hasLocation(loc: VisitorLocation): boolean {
  return Boolean(loc.country || loc.region || loc.city);
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
    if (parsed?.resolved) return parsed;
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

async function fetchJson(url: string, timeoutMs = 5000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`location failed (${res.status})`);
  return res.json();
}

/** Real public IP → approximate city / region / country. */
async function resolveFromIp(): Promise<VisitorLocation> {
  // 1) geojs — reliable CORS + free
  try {
    const data = (await fetchJson('https://get.geojs.io/v1/ip/geo.json')) as {
      country?: string;
      region?: string;
      city?: string;
    };
    const location: VisitorLocation = {
      country: data.country || null,
      region: data.region || null,
      city: data.city || null,
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
      country?: string;
      region?: string;
      city?: string;
    };
    if (data.success !== false) {
      const location: VisitorLocation = {
        country: data.country ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
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
      country_name?: string;
      region?: string;
      city?: string;
    };
    if (!data.error) {
      const location: VisitorLocation = {
        country: data.country_name ?? null,
        region: data.region ?? null,
        city: data.city ?? null,
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
 * Resolve the visitor’s approximate location for analytics.
 * Uses IP only — never asks for GPS (that prompt is reserved for checkout
 * “Use current location”, so a Deny here doesn’t lock delivery forever).
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

/** Display label for admin — city, region, country (or Unknown). */
export function formatVisitorLocation(row: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown';
}
