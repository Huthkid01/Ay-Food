-- Site visits + maintenance (Nexlogs-style for Ay Food)

create table if not exists public.site_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  visitor_type text not null check (visitor_type in ('guest', 'registered')),
  last_path text not null default '/',
  user_agent text,
  country text,
  region text,
  city text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_views int not null default 1 check (page_views >= 1)
);

create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references public.profiles (id) on delete set null,
  visitor_type text not null check (visitor_type in ('guest', 'registered')),
  path text not null,
  country text,
  region text,
  city text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_sessions_last_seen on public.site_sessions (last_seen_at desc);
create index if not exists idx_site_page_views_created on public.site_page_views (created_at desc);

create table if not exists public.site_settings (
  id text primary key default 'main',
  maintenance_enabled boolean not null default false,
  maintenance_message text not null default 'We are temporarily closed. Please check back soon.',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values ('main') on conflict (id) do nothing;

alter table public.site_sessions enable row level security;
alter table public.site_page_views enable row level security;
alter table public.site_settings enable row level security;

create policy "Staff read site sessions"
  on public.site_sessions for select using (public.is_staff());

create policy "Staff read site page views"
  on public.site_page_views for select using (public.is_staff());

create policy "Public read site settings"
  on public.site_settings for select using (true);

create policy "Staff update site settings"
  on public.site_settings for update using (public.is_staff()) with check (public.is_staff());

create or replace function public.record_site_visit(
  p_session_id text,
  p_path text,
  p_user_agent text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_heartbeat boolean default false
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
    country, region, city, first_seen_at, last_seen_at, page_views
  )
  values (
    p_session_id, v_user_id, v_visitor_type, v_path,
    nullif(left(coalesce(p_user_agent, ''), 500), ''),
    nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, ''),
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
    last_seen_at = now(),
    page_views = case
      when p_heartbeat then public.site_sessions.page_views
      else public.site_sessions.page_views + 1
    end;

  if not p_heartbeat then
    insert into public.site_page_views (
      session_id, user_id, visitor_type, path, country, region, city
    )
    values (
      p_session_id, v_user_id, v_visitor_type, v_path,
      nullif(p_country, ''), nullif(p_region, ''), nullif(p_city, '')
    );
  end if;
end;
$$;

grant execute on function public.record_site_visit(text, text, text, text, text, text, boolean) to anon, authenticated;

create or replace function public.clear_site_visits()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Forbidden';
  end if;
  truncate public.site_page_views;
  truncate public.site_sessions;
  return json_build_object('cleared', true);
end;
$$;

grant execute on function public.clear_site_visits() to authenticated;

alter publication supabase_realtime add table public.site_sessions;
alter publication supabase_realtime add table public.site_page_views;
alter publication supabase_realtime add table public.site_settings;
