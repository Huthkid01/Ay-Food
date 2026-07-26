import { getAdminToken } from '../lib/admin-token';
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

      const { isSupabaseConfigured, supabase } = await import('../lib/supabase');
      if (!isSupabaseConfigured()) return;

      const heartbeat = options?.heartbeat ?? false;
      const sessionId = getVisitorSessionId();
      if (!sessionId || sessionId.length < 8) return;

      const location: VisitorLocation = await getVisitorLocation();

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
        console.warn('[site-visit]', error.message);
      }
    } catch (err) {
      console.warn('[site-visit]', err);
    }
  },

  async purgeCurrentVisitorSession() {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (!isSupabaseConfigured() || !getAdminToken()) return;
    const sessionId = peekVisitorSessionId();
    if (!sessionId) return;
    try {
      const { adminRpc } = await import('../lib/admin-rpc');
      await adminRpc('admin_purge_visitor_session', { p_session_id: sessionId });
    } catch {
      // RPC may not be deployed yet — still clear local id below
    }
    clearVisitorSessionId();
  },

  async getStats(): Promise<SiteVisitorStats> {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (!isSupabaseConfigured()) return emptyStats();
    const { adminRpc } = await import('../lib/admin-rpc');
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
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (!isSupabaseConfigured()) return [];
    const { adminRpc } = await import('../lib/admin-rpc');
    const data = await adminRpc<SiteSession[]>('admin_active_sessions', {
      p_active_minutes: SITE_ACTIVE_WINDOW_MINUTES,
    });
    return Array.isArray(data) ? data : [];
  },

  async getRecentPageViews(limit = 80): Promise<SitePageView[]> {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (!isSupabaseConfigured()) return [];
    const { adminRpc } = await import('../lib/admin-rpc');
    const data = await adminRpc<SitePageView[]>('admin_recent_page_views', {
      p_limit: limit,
    });
    return Array.isArray(data) ? data : [];
  },

  async clearAll() {
    const { isSupabaseConfigured } = await import('../lib/supabase');
    if (!isSupabaseConfigured()) return;
    const { adminRpc } = await import('../lib/admin-rpc');
    await adminRpc('admin_clear_site_visits');
  },
};

/** @deprecated import from site-settings.service */
export { siteSettingsService } from './site-settings.service';
export type { SiteSettings } from './site-settings.types';
