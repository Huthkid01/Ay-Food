export type VisitorLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const CACHE_KEY = 'ay-food-visitor-location-v2';
const EMPTY: VisitorLocation = { country: null, region: null, city: null };

type Cached = VisitorLocation & { resolved: true };

function hasLocation(loc: VisitorLocation): boolean {
  return Boolean(loc.country || loc.region || loc.city);
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

async function fetchJson(url: string, timeoutMs = 4000): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`location failed (${res.status})`);
  return res.json();
}

/** Primary + fallbacks — cache both hits and misses for the tab session. */
async function resolveFromApis(): Promise<VisitorLocation> {
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
      };
      if (hasLocation(location)) return location;
    }
  } catch {
    // try next
  }

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
      };
      if (hasLocation(location)) return location;
    }
  } catch {
    // give up
  }

  return EMPTY;
}

export async function getVisitorLocation(): Promise<VisitorLocation> {
  const cached = readCache();
  if (cached) {
    const { resolved: _r, ...loc } = cached;
    return loc;
  }

  const location = await resolveFromApis();
  writeCache(location);
  return location;
}

/** Display label for admin — city, region, country (or Unknown). */
export function formatVisitorLocation(row: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown';
}
