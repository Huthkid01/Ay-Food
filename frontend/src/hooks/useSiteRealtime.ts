import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { MENU_CATALOG_KEY, subscribeCatalogChanged } from '../services/menu-catalog';
import { SITE_CONTENT_KEY, subscribeSiteContentChanged } from '../services/site-content.service';

function invalidateSiteMenu(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: MENU_CATALOG_KEY });
  void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
  void queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
  void queryClient.invalidateQueries({ queryKey: ['site-settings'] });
}

/** Live updates for storefront + admin (Supabase Realtime + local site cache events). */
export function useSiteRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubLocal = subscribeCatalogChanged(() => invalidateSiteMenu(queryClient));
    const unsubContent = subscribeSiteContentChanged(() => {
      void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
    });

    if (!isSupabaseConfigured()) {
      return () => {
        unsubLocal();
        unsubContent();
      };
    }

    const channel = supabase
      .channel('ay-food-site-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'foods' }, () => {
        invalidateSiteMenu(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_portions' }, () => {
        invalidateSiteMenu(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        invalidateSiteMenu(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_sessions' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_page_views' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['site-settings'] });
        void queryClient.invalidateQueries({ queryKey: SITE_CONTENT_KEY });
      })
      .subscribe();

    return () => {
      unsubLocal();
      unsubContent();
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
