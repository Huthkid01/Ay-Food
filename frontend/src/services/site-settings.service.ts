import type { SiteSettings } from './site-settings.types';

export type { SiteSettings } from './site-settings.types';

/** Cache maintenance settings for instant paint; source of truth is Supabase. */
const SETTINGS_CACHE_KEY = 'ay-food-site-settings';

const defaults = (): SiteSettings => ({
  maintenance_enabled: false,
  maintenance_message: 'We are temporarily closed. Please check back soon.',
});

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) return JSON.parse(raw) as SiteSettings;
  } catch {
    // ignore
  }
  return null;
}

function writeCache(next: SiteSettings) {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
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
        .select('maintenance_enabled, maintenance_message')
        .eq('id', 'main')
        .maybeSingle();
      if (!error && data) {
        const next = {
          maintenance_enabled: data.maintenance_enabled,
          maintenance_message: data.maintenance_message,
        };
        writeCache(next);
        return next;
      }
    }
    return cached ?? defaults();
  },

  async update(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (isSupabaseConfigured()) {
      const { adminRpc } = await import('../lib/admin-rpc');
      const row = await adminRpc<Record<string, unknown>>('admin_update_site_settings', {
        p_maintenance_enabled: next.maintenance_enabled,
        p_maintenance_message: next.maintenance_message,
      });
      const saved = {
        maintenance_enabled: Boolean(row.maintenance_enabled),
        maintenance_message: String(row.maintenance_message ?? next.maintenance_message),
      };
      writeCache(saved);
      return saved;
    }
    writeCache(next);
    return next;
  },
};
