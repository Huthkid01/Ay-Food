-- Admin visitor RPCs (security definer) so env-password admin (anon key) can read visits.
-- Same pattern as admin_list_orders — visits are already written via record_site_visit.

create or replace function public.admin_visitor_stats(p_active_minutes int default 5)
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
  return jsonb_build_object(
    'activeVisitors', (
      select count(*)::int from public.site_sessions where last_seen_at >= v_since
    ),
    'activeGuests', (
      select count(*)::int
      from public.site_sessions
      where last_seen_at >= v_since and visitor_type = 'guest'
    ),
    'visitsToday', (
      select count(*)::int from public.site_page_views where created_at >= v_today
    ),
    'totalSessions', (select count(*)::int from public.site_sessions)
  );
end;
$$;

create or replace function public.admin_active_sessions(p_active_minutes int default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_mins int := least(greatest(coalesce(p_active_minutes, 5), 1), 120);
  v_since timestamptz := now() - make_interval(mins => v_mins);
begin
  return coalesce(
    (
      select jsonb_agg(to_jsonb(s) order by s.last_seen_at desc)
      from (
        select *
        from public.site_sessions
        where last_seen_at >= v_since
        order by last_seen_at desc
        limit 100
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_recent_page_views(p_limit int default 80)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 80), 1), 200);
begin
  return coalesce(
    (
      select jsonb_agg(to_jsonb(v) order by v.created_at desc)
      from (
        select *
        from public.site_page_views
        order by created_at desc
        limit v_limit
      ) v
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_clear_site_visits()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate public.site_page_views;
  truncate public.site_sessions;
  return jsonb_build_object('cleared', true);
end;
$$;

create or replace function public.admin_update_site_settings(
  p_maintenance_enabled boolean,
  p_maintenance_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.site_settings%rowtype;
  v_msg text := coalesce(nullif(trim(p_maintenance_message), ''), 'We are temporarily closed. Please check back soon.');
begin
  if length(v_msg) > 1000 then
    v_msg := left(v_msg, 1000);
  end if;

  insert into public.site_settings (id, maintenance_enabled, maintenance_message, updated_at)
  values ('main', coalesce(p_maintenance_enabled, false), v_msg, now())
  on conflict (id) do update set
    maintenance_enabled = excluded.maintenance_enabled,
    maintenance_message = excluded.maintenance_message,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'maintenance_enabled', v_row.maintenance_enabled,
    'maintenance_message', v_row.maintenance_message
  );
end;
$$;

grant execute on function public.admin_visitor_stats(int) to anon, authenticated;
grant execute on function public.admin_active_sessions(int) to anon, authenticated;
grant execute on function public.admin_recent_page_views(int) to anon, authenticated;
grant execute on function public.admin_clear_site_visits() to anon, authenticated;
grant execute on function public.admin_update_site_settings(boolean, text) to anon, authenticated;
