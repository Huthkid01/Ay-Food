import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MENU_CATALOG_KEY, subscribeCatalogChanged } from '../services/menu-catalog';
import { SITE_CONTENT_KEY, subscribeSiteContentChanged } from '../services/site-content.service';

function invalidateStorefront(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
  void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
  void queryClient.invalidateQueries({ queryKey: ['site-settings'] });
}

function runWhenIdle(fn: () => void, timeoutMs = 3500) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => fn(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, Math.min(timeoutMs, 2000));
  return () => window.clearTimeout(id);
}

/** Live storefront updates (local events immediately; Supabase Realtime after idle). */
export function useSiteRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubLocal = subscribeCatalogChanged(() => invalidateStorefront(queryClient));
    const unsubContent = subscribeSiteContentChanged(() => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    });

    let cancelled = false;
    let removeChannel: (() => void) | undefined;

    const cancelIdle = runWhenIdle(() => {
      void (async () => {
        const { isSupabaseConfigured, supabase } = await import('../lib/supabase');
        if (cancelled || !isSupabaseConfigured()) return;

        const channel = supabase
          .channel('ay-food-site-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'foods' }, () => {
            invalidateStorefront(queryClient);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'food_portions' }, () => {
            invalidateStorefront(queryClient);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
            invalidateStorefront(queryClient);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
            invalidateStorefront(queryClient);
          })
          .subscribe();

        removeChannel = () => {
          void supabase.removeChannel(channel);
        };
      })();
    });

    return () => {
      cancelled = true;
      cancelIdle();
      removeChannel?.();
      unsubLocal();
      unsubContent();
    };
  }, [queryClient]);
}
