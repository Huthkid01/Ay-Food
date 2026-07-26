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

/**
 * Tawk script is loaded from index.html for speed.
 * This only hides chat on admin — never when the cart opens.
 */
export function TawkToChat() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin') || pathname === '/login';

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
