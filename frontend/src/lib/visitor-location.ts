export type VisitorLocation = {
  country: string | null;
  region: string | null;
  city: string | null;
  /** Visitor's public IP address (exact network identity) */
  ip: string | null;
  /** How the location was resolved — for debugging / admin confidence */
  source?: 'ip' | null;
};

const CACHE_KEY = 'ay-food-visitor-location-v5';
const EMPTY: VisitorLocation = {
  country: null,
  region: null,
  city: null,
  ip: null,
  source: null,
};

type Cached = VisitorLocation & { resolved: true; cachedAt: number };
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — avoid stale wrong city

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const lower = text.toLowerCase();
  if (
    lower === 'unknown' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'null' ||
    lower === '-' ||
    lower === 'undefined'
  ) {
    return null;
  }
  return text;
}

function hasUsefulPlace(loc: VisitorLocation): boolean {
  return Boolean(loc.country || loc.region || loc.city);
}

function stripCache(cached: Cached): VisitorLocation {
  const { resolved: _r, cachedAt: _c, ...loc } = cached;
  return loc;
}

function readCache(): Cached | null {
  try {
    // Drop older inaccurate caches so visitors re-resolve with the new multi-provider lookup
    sessionStorage.removeItem('ay-food-visitor-location-v3');
    sessionStorage.removeItem('ay-food-visitor-location-v4');

    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as Cached;
    if (!parsed?.resolved || !parsed.ip) return null;
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    // Never reuse a cache that only has an IP and no place
    if (!hasUsefulPlace(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(location: VisitorLocation) {
  try {
    const payload: Cached = { ...location, resolved: true, cachedAt: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function normalizeIp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ip = value.trim();
  if (!ip || ip.length > 64) return null;
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n > 255)) return null;
    // Reject private / localhost — those are never a real public visitor IP
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return null;
    if (a === 192 && b === 168) return null;
    if (a === 172 && b >= 16 && b <= 31) return null;
    return ip;
  }
  // IPv6 (loose)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) {
      return null;
    }
    return ip;
  }
  return null;
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`location failed (${res.status})`);
  return res.json();
}

/** Confirm the visitor’s real public IP from more than one source. */
async function resolvePublicIp(): Promise<string | null> {
  const providers: Array<() => Promise<string | null>> = [
    async () => {
      const data = (await fetchJson('https://api.ipify.org?format=json')) as { ip?: string };
      return normalizeIp(data.ip);
    },
    async () => {
      const data = (await fetchJson('https://get.geojs.io/v1/ip.json')) as { ip?: string };
      return normalizeIp(data.ip);
    },
    async () => {
      const data = (await fetchJson('https://api64.ipify.org?format=json')) as { ip?: string };
      return normalizeIp(data.ip);
    },
  ];

  const results = await Promise.allSettled(providers.map((fn) => fn()));
  const ips = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((ip): ip is string => Boolean(ip));

  if (ips.length === 0) return null;

  // Prefer an IP confirmed by 2+ providers
  const counts = new Map<string, number>();
  for (const ip of ips) counts.set(ip, (counts.get(ip) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [bestIp, bestCount] = ranked[0]!;
  if (bestCount >= 2) return bestIp;
  return bestIp;
}

type GeoHit = {
  country: string | null;
  region: string | null;
  city: string | null;
  provider: string;
};

function scoreHit(hit: GeoHit): number {
  let score = 0;
  if (hit.country) score += 2;
  if (hit.region) score += 2;
  if (hit.city) score += 3;
  return score;
}

function pickConsensus(field: 'country' | 'region' | 'city', hits: GeoHit[]): string | null {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    const value = hit[field];
    if (!value) continue;
    const key = value.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [bestKey, bestCount] = ranked[0]!;

  // Prefer values confirmed by 2+ providers when available
  if (bestCount >= 2 || ranked.length === 1) {
    const original = hits.find((h) => h[field]?.toLowerCase() === bestKey)?.[field] ?? null;
    return original;
  }

  // Otherwise take the most complete provider’s value
  const bestHit = [...hits].sort((a, b) => scoreHit(b) - scoreHit(a))[0];
  return bestHit?.[field] ?? null;
}

/** Look up place for a known public IP across several free GeoIP providers. */
async function resolvePlaceForIp(ip: string): Promise<Omit<VisitorLocation, 'ip' | 'source'>> {
  const lookups: Array<() => Promise<GeoHit | null>> = [
    async () => {
      const data = (await fetchJson(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`)) as {
        country?: string;
        region?: string;
        city?: string;
      };
      return {
        provider: 'geojs',
        country: cleanText(data.country),
        region: cleanText(data.region),
        city: cleanText(data.city),
      };
    },
    async () => {
      const data = (await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`)) as {
        success?: boolean;
        country?: string;
        region?: string;
        city?: string;
      };
      if (data.success === false) return null;
      return {
        provider: 'ipwho',
        country: cleanText(data.country),
        region: cleanText(data.region),
        city: cleanText(data.city),
      };
    },
    async () => {
      const data = (await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)) as {
        error?: boolean;
        country_name?: string;
        region?: string;
        city?: string;
      };
      if (data.error) return null;
      return {
        provider: 'ipapi',
        country: cleanText(data.country_name),
        region: cleanText(data.region),
        city: cleanText(data.city),
      };
    },
    async () => {
      // ip.sb often has solid city data for African ISPs
      const data = (await fetchJson(`https://api.ip.sb/geoip/${encodeURIComponent(ip)}`)) as {
        country?: string;
        region?: string;
        city?: string;
      };
      return {
        provider: 'ipsb',
        country: cleanText(data.country),
        region: cleanText(data.region),
        city: cleanText(data.city),
      };
    },
  ];

  const results = await Promise.allSettled(lookups.map((fn) => fn()));
  const hits = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((h): h is GeoHit => Boolean(h && (h.country || h.region || h.city)));

  if (hits.length === 0) {
    return { country: null, region: null, city: null };
  }

  return {
    country: pickConsensus('country', hits),
    region: pickConsensus('region', hits),
    city: pickConsensus('city', hits),
  };
}

/**
 * Resolve the visitor’s real public IP, then derive place from that IP
 * using multiple GeoIP providers (consensus), not a single flaky lookup.
 */
export async function getVisitorLocation(): Promise<VisitorLocation> {
  const cached = readCache();
  if (cached?.resolved) {
    return stripCache(cached);
  }

  const ip = await resolvePublicIp();
  if (!ip) {
    return { ...EMPTY, source: 'ip' };
  }

  const place = await resolvePlaceForIp(ip);
  const location: VisitorLocation = {
    ip,
    country: place.country,
    region: place.region,
    city: place.city,
    source: 'ip',
  };

  // Only cache when we at least have a verified IP + some place data
  if (hasUsefulPlace(location)) {
    writeCache(location);
  }

  return location;
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
