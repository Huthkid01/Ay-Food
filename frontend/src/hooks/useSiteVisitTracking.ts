import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminToken } from '../lib/admin-rpc';
import { siteVisitService } from '../services/site-visit.service';

const HEARTBEAT_MS = 60_000;

/** Track public storefront visits + heartbeat for “on site now”. */
export function useSiteVisitTracking(options?: { skip?: boolean }) {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);
  const skip = options?.skip ?? false;

  useEffect(() => {
    if (skip || getAdminToken()) return;
    if (location.pathname.startsWith('/admin')) return;
    if (location.pathname.startsWith('/formsubmit-ok')) return;

    const path = `${location.pathname}${location.search}`;
    if (lastPathRef.current !== path) {
      lastPathRef.current = path;
      void siteVisitService.record(path);
    }
  }, [location.pathname, location.search, skip]);

  useEffect(() => {
    if (skip || getAdminToken()) return;
    if (location.pathname.startsWith('/admin')) return;
    if (location.pathname.startsWith('/formsubmit-ok')) return;

    const tick = () => {
      if (getAdminToken()) return;
      const path = `${window.location.pathname}${window.location.search}`;
      void siteVisitService.record(path, { heartbeat: true });
    };

    const id = window.setInterval(tick, HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [skip, location.pathname]);
}
