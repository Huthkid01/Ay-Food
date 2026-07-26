import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminToken } from '../lib/admin-token';

const HEARTBEAT_MS = 60_000;

function runWhenIdle(fn: () => void, timeoutMs = 5000) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, Math.min(timeoutMs, 3000));
  return () => window.clearTimeout(id);
}

/** Track public storefront visits + heartbeat — starts after idle so it won't block LCP. */
export function useSiteVisitTracking(options?: { skip?: boolean }) {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const skip = options?.skip ?? false;

  useEffect(() => {
    if (skip) return;
    return runWhenIdle(() => setReady(true));
  }, [skip]);

  useEffect(() => {
    if (!ready || skip || getAdminToken()) return;
    if (location.pathname.startsWith('/admin')) return;
    if (location.pathname.startsWith('/formsubmit-ok')) return;

    const path = `${location.pathname}${location.search}`;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    void import('../services/site-visit.service').then(({ siteVisitService }) => {
      void siteVisitService.record(path);
    });
  }, [ready, location.pathname, location.search, skip]);

  useEffect(() => {
    if (!ready || skip || getAdminToken()) return;
    if (location.pathname.startsWith('/admin')) return;
    if (location.pathname.startsWith('/formsubmit-ok')) return;

    const tick = () => {
      if (getAdminToken()) return;
      const path = `${window.location.pathname}${window.location.search}`;
      void import('../services/site-visit.service').then(({ siteVisitService }) => {
        void siteVisitService.record(path, { heartbeat: true });
      });
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
  }, [ready, skip, location.pathname]);
}
