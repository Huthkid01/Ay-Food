import {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_MAINTENANCE_MESSAGE,
  type SiteSettings,
} from './site-settings.types';

export type { SiteSettings } from './site-settings.types';
export {
  DEFAULT_DELIVERY_FEE,
  DEFAULT_MAINTENANCE_MESSAGE,
} from './site-settings.types';

/** Cache maintenance settings for instant paint; source of truth is Supabase. */
const SETTINGS_CACHE_KEY = 'ay-food-site-settings';

const defaults = (): SiteSettings => ({
  maintenance_enabled: false,
  maintenance_message: DEFAULT_MAINTENANCE_MESSAGE,
  delivery_fee: DEFAULT_DELIVERY_FEE,
});

function normalize(row: Partial<SiteSettings> | null | undefined): SiteSettings {
  const fee = Number(row?.delivery_fee);
  return {
    maintenance_enabled: Boolean(row?.maintenance_enabled),
    maintenance_message:
      String(row?.maintenance_message ?? '').trim() || DEFAULT_MAINTENANCE_MESSAGE,
    delivery_fee:
      Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_DELIVERY_FEE,
  };
}

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) return normalize(JSON.parse(raw) as SiteSettings);
  } catch {
    // ignore
  }
  return null;
}

function writeCache(next: SiteSettings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(normalize(next)));
  } catch {
    // ignore
  }
}

export const siteSettingsService = {
  async get(): Promise<SiteSettings> {
    const cached = readCache();
    const { isSupabaseConfigured, supabase } = await import('../lib/supabase');
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('site_settings')
        .select('maintenance_enabled, maintenance_message, delivery_fee')
        .eq('id', 'main')
        .maybeSingle();
      if (!error && data) {
        const next = normalize(data as Partial<SiteSettings>);
        writeCache(next);
        return next;
      }
    }
    return cached ?? defaults();
  },

  async update(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.get();
    const next = normalize({ ...current, ...patch });
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (isSupabaseConfigured()) {
      const { adminRpc } = await import('../lib/admin-rpc');
      const row = await adminRpc<Record<string, unknown>>('admin_update_site_settings', {
        p_maintenance_enabled: next.maintenance_enabled,
        p_maintenance_message: next.maintenance_message,
        p_delivery_fee: next.delivery_fee,
      });
      const saved = normalize({
        maintenance_enabled: Boolean(row.maintenance_enabled),
        maintenance_message: String(row.maintenance_message ?? next.maintenance_message),
        delivery_fee: Number(row.delivery_fee ?? next.delivery_fee),
      });
      writeCache(saved);
      return saved;
    }
    writeCache(next);
    return next;
  },
};
