/** Reverse-geocode GPS → a fillable street address for checkout (no API key). */

export type ResolvedDeliveryAddress = {
  address: string;
  lat: number;
  lon: number;
  mapsUrl: string;
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

/**
 * Ask for GPS permission (browser dialog when state is “prompt”),
 * reverse-geocode, and return a delivery address + Maps link.
 */
export async function resolveDeliveryAddressFromGps(): Promise<ResolvedDeliveryAddress> {
  const pos = await getCurrentPosition();
  const { latitude: lat, longitude: lon } = pos.coords;
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

  const address = await reverseGeocodeAddress(lat, lon);
  if (!address) {
    return {
      address: `Near ${lat.toFixed(5)}, ${lon.toFixed(5)} (Ogijo area — please add street / landmark)`,
      lat,
      lon,
      mapsUrl,
    };
  }

  return { address, lat, lon, mapsUrl };
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
