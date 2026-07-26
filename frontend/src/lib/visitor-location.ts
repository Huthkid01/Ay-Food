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

/** Reverse-geocode GPS coords → city / region / country (no API key). */
async function reverseGeocode(lat: number, lon: number): Promise<VisitorLocation | null> {
  try {
    const data = (await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    )) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const location: VisitorLocation = {
      city: data.city || data.locality || null,
      region: data.principalSubdivision || null,
      country: data.countryName || null,
      source: 'gps',
    };
    return hasLocation(location) ? location : null;
  } catch {
    return null;
  }
}

function getCurrentPosition(timeoutMs = 8000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000,
    });
  });
}

/** Real device GPS (asks browser permission once) + reverse geocode. */
async function resolveFromBrowserGps(): Promise<VisitorLocation | null> {
  try {
    const pos = await getCurrentPosition(8000);
    return reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
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
 * Resolve the visitor’s real location:
 * 1) Browser GPS (if allowed) → reverse geocode
 * 2) Otherwise their public IP address lookup
 * Never invents fake places — Unknown if both fail.
 */
export async function getVisitorLocation(): Promise<VisitorLocation> {
  const cached = readCache();

  // Already have precise GPS for this tab
  if (cached?.source === 'gps' && hasLocation(cached)) {
    return stripCache(cached);
  }

  // Have IP from earlier — return it fast, still try to upgrade to GPS
  if (cached && hasLocation(cached)) {
    void resolveFromBrowserGps().then((gps) => {
      if (gps && hasLocation(gps)) writeCache(gps);
    });
    return stripCache(cached);
  }

  // Miss-cache: don't hammer APIs every heartbeat
  if (cached?.resolved && !hasLocation(cached)) {
    return stripCache(cached);
  }

  const ipPromise = resolveFromIp();
  const gpsPromise = resolveFromBrowserGps();

  // Prefer GPS if it answers quickly (user may need to allow the prompt)
  const quickGps = await Promise.race([
    gpsPromise,
    new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 4500);
    }),
  ]);

  if (quickGps && hasLocation(quickGps)) {
    writeCache(quickGps);
    return quickGps;
  }

  const ip = await ipPromise;
  if (hasLocation(ip)) {
    writeCache(ip);
    void gpsPromise.then((gps) => {
      if (gps && hasLocation(gps)) writeCache(gps);
    });
    return ip;
  }

  const lateGps = await gpsPromise;
  if (lateGps && hasLocation(lateGps)) {
    writeCache(lateGps);
    return lateGps;
  }

  writeCache(EMPTY);
  return EMPTY;
}

/** Display label for admin — city, region, country (or Unknown). */
export function formatVisitorLocation(row: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  return [row.city, row.region, row.country].filter(Boolean).join(', ') || 'Unknown';
}
