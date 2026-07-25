-- require_admin_token must not UPDATE when called from STABLE RPCs

create or replace function public.require_admin_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or length(trim(p_token)) < 32 then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.admin_sessions
    where token = trim(p_token)
      and expires_at > now()
  ) then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
end;
$$;

-- Drop STABLE on admin read RPCs that may still be marked stable from prior defs
create or replace function public.admin_list_orders(p_admin_token text, p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
  perform public.require_admin_token(p_admin_token);
  return coalesce(
    (
      select jsonb_agg(row_json order by sort_at desc)
      from (
        select
          (
            to_jsonb(o)
            || jsonb_build_object(
              'order_items',
              coalesce(
                (
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', i.id,
                      'food_name', i.food_name,
                      'portion_name', i.portion_name,
                      'quantity', i.quantity,
                      'unit_price', i.unit_price,
                      'total_price', i.total_price,
                      'notes', i.notes,
                      'pack_name', i.pack_name
                    )
                    order by i.id
                  )
                  from public.order_items i
                  where i.order_id = o.id
                ),
                '[]'::jsonb
              )
            )
          ) as row_json,
          o.created_at as sort_at
        from public.orders o
        order by o.created_at desc
        limit v_limit
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_order_stats(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today timestamptz := date_trunc('day', now());
  v_week timestamptz := date_trunc('week', now());
  v_month timestamptz := date_trunc('month', now());
begin
  perform public.require_admin_token(p_admin_token);
  return jsonb_build_object(
    'totalOrders', (select count(*)::int from public.orders where status <> 'CANCELLED'),
    'totalRevenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED'), 0),
    'todayOrders', (select count(*)::int from public.orders where status <> 'CANCELLED' and created_at >= v_today),
    'todayRevenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED' and created_at >= v_today), 0),
    'weekOrders', (select count(*)::int from public.orders where status <> 'CANCELLED' and created_at >= v_week),
    'weekRevenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED' and created_at >= v_week), 0),
    'monthOrders', (select count(*)::int from public.orders where status <> 'CANCELLED' and created_at >= v_month),
    'monthRevenue', coalesce((select sum(total) from public.orders where status <> 'CANCELLED' and created_at >= v_month), 0),
    'totalCustomers', (
      select count(distinct lower(customer_email))::int
      from public.orders
      where status <> 'CANCELLED'
    )
  );
end;
$$;

create or replace function public.admin_visitor_stats(p_admin_token text, p_active_minutes int default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
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
    'visitsToday', (
      select count(*)::int from public.site_page_views where created_at >= v_today
    ),
    'totalSessions', (select count(*)::int from public.site_sessions)
  );
end;
$$;

create or replace function public.admin_active_sessions(p_admin_token text, p_active_minutes int default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mins int := least(greatest(coalesce(p_active_minutes, 5), 1), 120);
  v_since timestamptz := now() - make_interval(mins => v_mins);
begin
  perform public.require_admin_token(p_admin_token);
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

create or replace function public.admin_recent_page_views(p_admin_token text, p_limit int default 80)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 80), 1), 200);
begin
  perform public.require_admin_token(p_admin_token);
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

create or replace function public.admin_list_categories(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  return coalesce(
    (
      select jsonb_agg(row_json order by sort_order asc, name asc)
      from (
        select
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug,
            'description', c.description,
            'image', c.image,
            'sort_order', c.sort_order,
            'is_active', c.is_active,
            'foods', jsonb_build_array(jsonb_build_object('count', (
              select count(*)::int from public.foods f where f.category_id = c.id
            )))
          ) as row_json,
          c.sort_order,
          c.name
        from public.categories c
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_list_foods(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  return coalesce(
    (
      select jsonb_agg(row_json order by name asc)
      from (
        select
          jsonb_build_object(
            'id', f.id,
            'name', f.name,
            'slug', f.slug,
            'description', f.description,
            'image', f.image,
            'tags', f.tags,
            'is_available', f.is_available,
            'is_popular', f.is_popular,
            'is_new', f.is_new,
            'prep_time_minutes', f.prep_time_minutes,
            'categories', jsonb_build_object(
              'name', coalesce(c.name, 'Uncategorized'),
              'slug', coalesce(c.slug, 'uncategorized')
            ),
            'food_portions', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', p.id,
                    'portion_name', p.portion_name,
                    'price', p.price,
                    'is_available', p.is_available
                  )
                  order by p.portion_name
                )
                from public.food_portions p
                where p.food_id = f.id
              ),
              '[]'::jsonb
            )
          ) as row_json,
          f.name
        from public.foods f
        left join public.categories c on c.id = f.category_id
      ) s
    ),
    '[]'::jsonb
  );
end;
$$;
