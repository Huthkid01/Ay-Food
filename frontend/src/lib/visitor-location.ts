export type VisitorLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
};

const CACHE_KEY = 'ay-food-visitor-location';
const EMPTY: VisitorLocation = { country: null, region: null, city: null };

function hasLocation(loc: VisitorLocation): boolean {
  return Boolean(loc.country || loc.region || loc.city);
}

function readCache(): VisitorLocation | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as VisitorLocation;
    return hasLocation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(location: VisitorLocation) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
  } catch {
    // ignore
  }
}

async function fetchJson(url: string, timeoutMs = 4500): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`location failed (${res.status})`);
  return res.json();
}

/** Primary + fallbacks — same idea as Travel & Tour geo enrichment, client-side for Vite. */
async function resolveFromApis(): Promise<VisitorLocation> {
  // 1) ipapi.co
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
    // try next
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
      };
      if (hasLocation(location)) return location;
    }
  } catch {
    // try next
  }

  // 3) ip-api.com (HTTP JSON; works on many networks)
  try {
    const data = (await fetchJson(
      'https://ip-api.com/json/?fields=status,country,regionName,city',
    )) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status === 'success') {
      const location: VisitorLocation = {
        country: data.country ?? null,
        region: data.regionName ?? null,
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
  if (cached) return cached;

  const location = await resolveFromApis();
  if (hasLocation(location)) writeCache(location);
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
