-- Store each visitor's public IP on site visits for admin Site Visits.

alter table public.site_sessions
  add column if not exists ip_address text;

alter table public.site_page_views
  add column if not exists ip_address text;

comment on column public.site_sessions.ip_address is
  'Visitor public IP captured at first / last visit via IP geolocation lookup';
comment on column public.site_page_views.ip_address is
  'Visitor public IP at the time of this page view';

drop function if exists public.record_site_visit(text, text, text, text, text, text, boolean);

create or replace function public.record_site_visit(
  p_session_id text,
  p_path text,
  p_user_agent text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_heartbeat boolean default false,
  p_ip_address text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_visitor_type text;
  v_path text;
  v_ip text;
begin
  if p_session_id is null or length(trim(p_session_id)) < 8 then
    raise exception 'Invalid session id' using errcode = '22023';
  end if;

  v_path := coalesce(nullif(trim(p_path), ''), '/');
  if length(v_path) > 500 then
    v_path := left(v_path, 500);
  end if;

  -- Never track admin panel
  if v_path like '/admin%' then
    return;
  end if;

  v_ip := nullif(trim(p_ip_address), '');
  if v_ip is not null and length(v_ip) > 64 then
    v_ip := left(v_ip, 64);
  end if;

  v_user_id := auth.uid();
  v_visitor_type := case when v_user_id is null then 'guest' else 'registered' end;

  if v_user_id is not null and exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'CASHIER', 'DELIVERY_STAFF')
  ) then
    return;
  end if;

  insert into public.site_sessions (
    session_id, user_id, visitor_type, last_path, user_agent,
    country, region, city, ip_address, first_seen_at, last_seen_at, page_views
  )
  values (
    p_session_id, v_user_id, v_visitor_type, v_path,
    nullif(left(coalesce(p_user_agent, ''), 500), ''),
    nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''),
    v_ip,
    now(), now(), 1
  )
  on conflict (session_id) do update set
    user_id = excluded.user_id,
    visitor_type = excluded.visitor_type,
    last_path = excluded.last_path,
    user_agent = coalesce(excluded.user_agent, public.site_sessions.user_agent),
    country = coalesce(excluded.country, public.site_sessions.country),
    region = coalesce(excluded.region, public.site_sessions.region),
    city = coalesce(excluded.city, public.site_sessions.city),
    ip_address = coalesce(excluded.ip_address, public.site_sessions.ip_address),
    last_seen_at = now(),
    page_views = case
      when p_heartbeat then public.site_sessions.page_views
      else public.site_sessions.page_views + 1
    end;

  if not p_heartbeat then
    insert into public.site_page_views (
      session_id, user_id, visitor_type, path, country, region, city, ip_address
    )
    values (
      p_session_id, v_user_id, v_visitor_type, v_path,
      nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''),
      v_ip
    );
  end if;
end;
$$;

grant execute on function public.record_site_visit(text, text, text, text, text, text, boolean, text)
  to anon, authenticated;
