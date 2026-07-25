import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { adminRpc, getAdminToken } from '../lib/admin-rpc';
import {
  clearVisitorSessionId,
  getVisitorSessionId,
  peekVisitorSessionId,
} from '../lib/visitor-session';
import { getVisitorLocation, type VisitorLocation } from '../lib/visitor-location';

export const SITE_ACTIVE_WINDOW_MINUTES = 5;

export type SiteSession = {
  id: string;
  session_id: string;
  visitor_type: 'guest' | 'registered';
  last_path: string;
  user_agent: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  first_seen_at: string;
  last_seen_at: string;
  page_views: number;
};

export type SitePageView = {
  id: string;
  session_id: string;
  visitor_type: 'guest' | 'registered';
  path: string;
  country: string | null;
  region: string | null;
  city: string | null;
  created_at: string;
};

export type SiteVisitorStats = {
  activeVisitors: number;
  activeGuests: number;
  visitsToday: number;
  totalSessions: number;
};

const emptyStats = (): SiteVisitorStats => ({
  activeVisitors: 0,
  activeGuests: 0,
  visitsToday: 0,
  totalSessions: 0,
});

/** Site visits are database-only (Supabase). No localStorage analytics. */
export const siteVisitService = {
  async record(path: string, options?: { heartbeat?: boolean }) {
    try {
      if (path.startsWith('/admin') || path.startsWith('/formsubmit-ok')) return;
      if (getAdminToken()) return;
      if (!isSupabaseConfigured()) return;

      const heartbeat = options?.heartbeat ?? false;
      const sessionId = getVisitorSessionId();
      if (!sessionId || sessionId.length < 8) return;

      const location: VisitorLocation = await getVisitorLocation();

      // Re-check after await — admin may have signed in while location resolved
      if (getAdminToken()) return;
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        return;
      }

      const { error } = await supabase.rpc('record_site_visit', {
        p_session_id: sessionId,
        p_path: path.slice(0, 500),
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
        p_country: location.country,
        p_region: location.region,
        p_city: location.city,
        p_heartbeat: heartbeat,
      });
      if (error) {
        // Soft-fail — never break the storefront
        console.warn('[site-visit]', error.message);
      }
    } catch (err) {
      console.warn('[site-visit]', err);
    }
  },

  /** Remove this browser's visit row(s) after admin login / session restore. */
  async purgeCurrentVisitorSession() {
    if (!isSupabaseConfigured() || !getAdminToken()) return;
    const sessionId = peekVisitorSessionId();
    if (!sessionId) return;
    try {
      await adminRpc('admin_purge_visitor_session', { p_session_id: sessionId });
    } catch {
      // RPC may not be deployed yet — still clear local id below
    }
    clearVisitorSessionId();
  },

  async getStats(): Promise<SiteVisitorStats> {
    if (!isSupabaseConfigured()) return emptyStats();
    const row = await adminRpc<Record<string, unknown>>('admin_visitor_stats', {
      p_active_minutes: SITE_ACTIVE_WINDOW_MINUTES,
    });
    return {
      activeVisitors: Number(row.activeVisitors ?? 0),
      activeGuests: Number(row.activeGuests ?? 0),
      visitsToday: Number(row.visitsToday ?? 0),
      totalSessions: Number(row.totalSessions ?? 0),
    };
  },

  async getActiveSessions(): Promise<SiteSession[]> {
    if (!isSupabaseConfigured()) return [];
    const data = await adminRpc<SiteSession[]>('admin_active_sessions', {
      p_active_minutes: SITE_ACTIVE_WINDOW_MINUTES,
    });
    return Array.isArray(data) ? data : [];
  },

  async getRecentPageViews(limit = 80): Promise<SitePageView[]> {
    if (!isSupabaseConfigured()) return [];
    const data = await adminRpc<SitePageView[]>('admin_recent_page_views', {
      p_limit: limit,
    });
    return Array.isArray(data) ? data : [];
  },

  async clearAll() {
    if (!isSupabaseConfigured()) return;
    await adminRpc('admin_clear_site_visits');
  },
};

export type SiteSettings = {
  maintenance_enabled: boolean;
  maintenance_message: string;
};

/** Cache maintenance settings for instant paint; source of truth is Supabase. */
const SETTINGS_CACHE_KEY = 'ay-food-site-settings';

export const siteSettingsService = {
  async get(): Promise<SiteSettings> {
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
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      }
    }
    try {
      const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
      if (raw) return JSON.parse(raw) as SiteSettings;
    } catch {
      // ignore
    }
    return {
      maintenance_enabled: false,
      maintenance_message: 'We are temporarily closed. Please check back soon.',
    };
  },

  async update(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    if (isSupabaseConfigured()) {
      const row = await adminRpc<Record<string, unknown>>('admin_update_site_settings', {
        p_maintenance_enabled: next.maintenance_enabled,
        p_maintenance_message: next.maintenance_message,
      });
      const saved = {
        maintenance_enabled: Boolean(row.maintenance_enabled),
        maintenance_message: String(row.maintenance_message ?? next.maintenance_message),
      };
      try {
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(saved));
      } catch {
        // ignore
      }
      return saved;
    }
    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    return next;
  },
};
