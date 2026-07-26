import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    Tawk_API?: {
      hideWidget?: () => void;
      showWidget?: () => void;
      onLoad?: () => void;
      customStyle?: Record<string, unknown>;
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SRC = 'https://embed.tawk.to/6a65570b15ab181d4e3c7bf2/1judto3bv';

function loadTawkScript() {
  if (document.getElementById('tawk-to-script')) return;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  window.Tawk_API.customStyle = {
    visibility: {
      desktop: { position: 'br', xOffset: 16, yOffset: 16 },
      mobile: { position: 'br', xOffset: 12, yOffset: 12 },
    },
  };
  const s1 = document.createElement('script');
  s1.id = 'tawk-to-script';
  s1.async = true;
  s1.src = TAWK_SRC;
  s1.charset = 'UTF-8';
  s1.setAttribute('crossorigin', '*');
  document.body.appendChild(s1);
}

function runWhenIdle(fn: () => void, timeoutMs = 4000) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, Math.min(timeoutMs, 2500));
  return () => window.clearTimeout(id);
}

/**
 * Loads Tawk after first paint / idle so it doesn't compete with LCP.
 * Hides chat on admin — never when the cart opens.
 */
export function TawkToChat() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname === '/login';

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    const cancelIdle = runWhenIdle(() => {
      if (!cancelled) loadTawkScript();
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [isAdmin]);

  useEffect(() => {
    const apply = () => {
      const api = window.Tawk_API;
      if (!api) return;
      if (isAdmin) api.hideWidget?.();
      else api.showWidget?.();
    };

    apply();

    const api = window.Tawk_API || (window.Tawk_API = {});
    const prev = api.onLoad;
    api.onLoad = () => {
      prev?.();
      apply();
    };

    const id = window.setInterval(apply, 500);
    const stop = window.setTimeout(() => window.clearInterval(id), 4000);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [isAdmin]);

  return null;
}
