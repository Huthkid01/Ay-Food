-- Visits today = unique visitors (sessions), not every page click.

create or replace function public.admin_visitor_stats(
  p_admin_token text,
  p_active_minutes int default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_mins int := least(greatest(coalesce(p_active_minutes, 5), 1), 120);
  v_since timestamptz := now() - make_interval(mins => v_mins);
  v_today timestamptz := date_trunc('day', now());
begin
  perform public.require_admin_token(p_admin_token);
  return jsonb_build_object(
    'activeVisitors', (
      select count(*)::int from public.site_sessions where last_seen_at >= v_since
    ),
    'activeGuests', (
      select count(*)::int
      from public.site_sessions
      where last_seen_at >= v_since and visitor_type = 'guest'
    ),
    -- One browser session = one visit for the day (not every /menu, /track click)
    'visitsToday', (
      select count(*)::int
      from public.site_sessions
      where last_seen_at >= v_today
    ),
    'pageViewsToday', (
      select count(*)::int
      from public.site_page_views
      where created_at >= v_today
    ),
    'totalSessions', (select count(*)::int from public.site_sessions)
  );
end;
$$;

grant execute on function public.admin_visitor_stats(text, int) to anon, authenticated;

comment on function public.admin_visitor_stats(text, int) is
  'Admin visit stats. visitsToday counts unique sessions active today, not raw page views.';
