/** Reverse-geocode GPS → a fillable street address for checkout (no API key). */

export type ResolvedDeliveryAddress = {
  address: string;
  lat: number;
  lon: number;
  mapsUrl: string;
  city?: string | null;
  state?: string | null;
  landmark?: string | null;
};

export type GeolocationPermissionState = PermissionState | 'unsupported';

export async function getGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unsupported';
  try {
    if (!navigator.permissions?.query) return 'prompt';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    // Safari / some browsers throw on geolocation permission query
    return 'prompt';
  }
}

function getCurrentPosition(timeoutMs = 15000): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 0, // always ask fresh — better chance of a real prompt when allowed
    });
  });
}

async function reverseGeocodeAddress(lat: number, lon: number): Promise<string | null> {
  // 1) OpenStreetMap Nominatim — best free street-level label
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { display_name?: string };
      if (data.display_name?.trim()) return data.display_name.trim();
    }
  } catch {
    // fallback below
  }

  // 2) BigDataCloud
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const parts = [
      data.locality || data.city,
      data.principalSubdivision,
      data.countryName,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

type ReverseGeoMeta = {
  city: string | null;
  state: string | null;
  landmark: string | null;
};

async function reverseGeocodeMeta(lat: number, lon: number): Promise<ReverseGeoMeta> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'json');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { city: null, state: null, landmark: null };
    const data = (await res.json()) as { address?: Record<string, string | undefined> };
    const addr = data.address ?? {};
    return {
      city: addr.city || addr.town || addr.village || addr.county || null,
      state: addr.state || addr.state_district || null,
      landmark: addr.road || addr.neighbourhood || addr.suburb || addr.amenity || null,
    };
  } catch {
    return { city: null, state: null, landmark: null };
  }
}

/**
 * Forward-geocode a typed address → lat/lon for delivery fee (no API key).
 * Biased toward Nigeria / the kitchen area. Returns null if nothing useful is found.
 */
export async function geocodeDeliveryAddress(
  query: string,
  near?: { lat: number; lon: number },
): Promise<ResolvedDeliveryAddress | null> {
  const q = query.trim();
  if (q.length < 8) return null;

  const searchQuery = /nigeria/i.test(q) ? q : `${q}, Nigeria`;

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'ng');
    url.searchParams.set('addressdetails', '1');
    if (near) {
      const pad = 0.55;
      // Nominatim viewbox: left, top, right, bottom
      url.searchParams.set(
        'viewbox',
        `${near.lon - pad},${near.lat + pad},${near.lon + pad},${near.lat - pad}`,
      );
      url.searchParams.set('bounded', '0');
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: Record<string, string | undefined>;
    }>;
    const hit = results[0];
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const addr = hit.address ?? {};
    return {
      address: hit.display_name?.trim() || q,
      lat,
      lon,
      mapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
      city: addr.city || addr.town || addr.village || addr.county || null,
      state: addr.state || addr.state_district || null,
      landmark: addr.road || addr.neighbourhood || addr.suburb || addr.amenity || null,
    };
  } catch {
    return null;
  }
}

/**
 * Ask for GPS permission (browser dialog when state is “prompt”),
 * reverse-geocode, and return a delivery address + Maps link.
 */
export async function resolveDeliveryAddressFromGps(): Promise<ResolvedDeliveryAddress> {
  const pos = await getCurrentPosition();
  const { latitude: lat, longitude: lon } = pos.coords;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

  const [address, meta] = await Promise.all([
    reverseGeocodeAddress(lat, lon),
    reverseGeocodeMeta(lat, lon),
  ]);
  if (!address) {
    return {
      address: `Near ${lat.toFixed(5)}, ${lon.toFixed(5)} (Ogijo area — please add street / landmark)`,
      lat,
      lon,
      mapsUrl,
      city: meta.city,
      state: meta.state,
      landmark: meta.landmark,
    };
  }

  return {
    address,
    lat,
    lon,
    mapsUrl,
    city: meta.city,
    state: meta.state,
    landmark: meta.landmark,
  };
}

export function geolocationErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as GeolocationPositionError).code;
    if (code === 1) {
      return 'Location is blocked for this site. Enable it in your browser settings, then tap Use current location again.';
    }
    if (code === 2) return 'Location unavailable. Please type your address.';
    if (code === 3) return 'Location timed out. Please try again or type your address.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not get your location. Please type your address.';
}

/** Short steps when the browser has permanently blocked location for this site. */
export function locationBlockedHelp(): string {
  return 'Location was previously blocked. In your browser: site settings → Location → Allow, then tap Use current location again.';
}
