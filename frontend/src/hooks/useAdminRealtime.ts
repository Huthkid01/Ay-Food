import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

function invalidateOrders(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
}

/** Live invalidation for admin queries from Supabase Realtime (database only). */
export function useAdminRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('ay-food-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        invalidateOrders(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        invalidateOrders(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'foods' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-foods'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['menu-foods'] });
        void queryClient.invalidateQueries({ queryKey: ['menu-catalog'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
        void queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
        void queryClient.invalidateQueries({ queryKey: ['menu-catalog'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        invalidateOrders(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_sessions' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-active-sessions'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_page_views' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['admin-visitor-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-recent-visits'] });
        void queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
