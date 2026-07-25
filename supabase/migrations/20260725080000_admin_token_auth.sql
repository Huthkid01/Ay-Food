-- Harden admin RPCs: password lives in DB (hashed), not in the Vite bundle.
-- Every admin_* function requires p_admin_token from admin_login.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_credentials (
  id text primary key default 'main',
  email text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  token text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_admin_sessions_expires on public.admin_sessions (expires_at);

alter table public.admin_credentials enable row level security;
alter table public.admin_sessions enable row level security;
-- No policies for anon/authenticated → only security definer functions can touch these.

insert into public.admin_credentials (id, email, password_hash)
values (
  'main',
  'admin@ayfoodpalace.com',
  extensions.crypt('Ayfoodpalace2026#', extensions.gen_salt('bf'))
)
on conflict (id) do update set
  email = excluded.email,
  password_hash = excluded.password_hash,
  updated_at = now();

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

  update public.admin_sessions
  set last_seen_at = now(),
      expires_at = greatest(expires_at, now() + interval '12 hours')
  where token = trim(p_token)
    and expires_at > now();

  if not found then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cred public.admin_credentials%rowtype;
  v_token text;
begin
  if length(v_email) < 3 or p_password is null or length(p_password) < 8 then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  select * into v_cred from public.admin_credentials where id = 'main' limit 1;
  if not found then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  if lower(v_cred.email) <> v_email
     or v_cred.password_hash <> extensions.crypt(p_password, v_cred.password_hash) then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.admin_sessions (token, email, expires_at)
  values (v_token, v_email, now() + interval '24 hours');

  -- prune old sessions
  delete from public.admin_sessions where expires_at < now() - interval '7 days';

  return jsonb_build_object(
    'token', v_token,
    'email', v_email,
    'expiresAt', (now() + interval '24 hours')
  );
end;
$$;

create or replace function public.admin_logout(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions where token = trim(coalesce(p_admin_token, ''));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_logout(text) to anon, authenticated;
-- require_admin_token is only called inside other security definer funcs — do not grant to anon

-- Drop unauthenticated overloads, then recreate gated versions.
drop function if exists public.admin_list_orders(int);
drop function if exists public.admin_update_order_status(uuid, public.order_status);
drop function if exists public.admin_order_stats();
drop function if exists public.admin_visitor_stats(int);
drop function if exists public.admin_active_sessions(int);
drop function if exists public.admin_recent_page_views(int);
drop function if exists public.admin_clear_site_visits();
drop function if exists public.admin_update_site_settings(boolean, text);
drop function if exists public.admin_list_categories();
drop function if exists public.admin_upsert_category(jsonb);
drop function if exists public.admin_delete_category(uuid);
drop function if exists public.admin_list_foods();
drop function if exists public.admin_upsert_food(jsonb);
drop function if exists public.admin_delete_food(uuid);
drop function if exists public.admin_update_site_content(jsonb);
drop function if exists public.admin_import_flyer_menu(jsonb, jsonb);

create or replace function public.admin_list_orders(p_admin_token text, p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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

create or replace function public.admin_update_order_status(
  p_admin_token text,
  p_order_id uuid,
  p_status public.order_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_admin_token(p_admin_token);
  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found';
  end if;

  insert into public.order_status_history (order_id, status, note)
  values (v_order.id, p_status, 'Status updated by admin');

  return to_jsonb(v_order);
end;
$$;

create or replace function public.admin_order_stats(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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
stable
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
stable
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

create or replace function public.admin_clear_site_visits(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  truncate public.site_page_views;
  truncate public.site_sessions;
  return jsonb_build_object('cleared', true);
end;
$$;

create or replace function public.admin_update_site_settings(
  p_admin_token text,
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
  perform public.require_admin_token(p_admin_token);
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

create or replace function public.admin_list_categories(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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

create or replace function public.admin_upsert_category(p_admin_token text, p_category jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_id uuid;
  c public.categories%rowtype;
  v_count int;
  v_slug text;
begin
  perform public.require_admin_token(p_admin_token);
  select id into v_restaurant_id from public.restaurants where slug = 'ay-food' limit 1;
  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_id := nullif(p_category->>'id', '')::uuid;
  v_slug := nullif(trim(p_category->>'slug'), '');

  if v_id is null and v_slug is not null then
    select id into v_id
    from public.categories
    where restaurant_id = v_restaurant_id and slug = v_slug
    limit 1;
  end if;

  if v_id is null then
    insert into public.categories (
      name, slug, description, image, sort_order, is_active, restaurant_id
    ) values (
      coalesce(nullif(trim(p_category->>'name'), ''), 'Category'),
      coalesce(v_slug, 'category'),
      nullif(p_category->>'description', ''),
      nullif(p_category->>'image', ''),
      coalesce((p_category->>'sort_order')::int, 0),
      coalesce((p_category->>'is_active')::boolean, true),
      v_restaurant_id
    )
    returning * into c;
  else
    update public.categories
    set
      name = coalesce(nullif(trim(p_category->>'name'), ''), name),
      slug = coalesce(v_slug, slug),
      description = case
        when p_category ? 'description' then nullif(p_category->>'description', '')
        else description
      end,
      image = case
        when p_category ? 'image' then nullif(p_category->>'image', '')
        else image
      end,
      sort_order = coalesce((p_category->>'sort_order')::int, sort_order),
      is_active = coalesce((p_category->>'is_active')::boolean, is_active),
      updated_at = now()
    where id = v_id
    returning * into c;

    if not found then
      raise exception 'Category not found';
    end if;
  end if;

  select count(*)::int into v_count from public.foods where category_id = c.id;

  return jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'slug', c.slug,
    'description', c.description,
    'image', c.image,
    'sort_order', c.sort_order,
    'is_active', c.is_active,
    'foods', jsonb_build_array(jsonb_build_object('count', v_count))
  );
end;
$$;

create or replace function public.admin_delete_category(p_admin_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  delete from public.categories where id = p_id;
  if not found then
    raise exception 'Category not found';
  end if;
  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.admin_list_foods(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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

create or replace function public.admin_upsert_food(p_admin_token text, p_food jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_id uuid;
  f public.foods%rowtype;
  v_price double precision;
  v_portion_id uuid;
  v_cat_name text;
  v_cat_slug text;
  v_portions jsonb;
  v_portion jsonb;
begin
  perform public.require_admin_token(p_admin_token);
  select id into v_restaurant_id from public.restaurants where slug = 'ay-food' limit 1;
  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_id := nullif(p_food->>'id', '')::uuid;
  v_price := coalesce((p_food->>'price')::double precision, 0);

  if v_id is null then
    if nullif(p_food->>'slug', '') is not null then
      select id into v_id
      from public.foods
      where restaurant_id = v_restaurant_id and slug = trim(p_food->>'slug')
      limit 1;
    end if;
  end if;

  if v_id is null then
    if nullif(p_food->>'category_id', '') is null then
      raise exception 'category_id is required';
    end if;

    insert into public.foods (
      name, slug, description, image, category_id, restaurant_id,
      is_available, is_popular, is_new, prep_time_minutes, tags
    ) values (
      coalesce(nullif(trim(p_food->>'name'), ''), 'Food'),
      coalesce(nullif(trim(p_food->>'slug'), ''), 'food'),
      nullif(p_food->>'description', ''),
      nullif(p_food->>'image', ''),
      (p_food->>'category_id')::uuid,
      v_restaurant_id,
      coalesce((p_food->>'is_available')::boolean, true),
      coalesce((p_food->>'is_popular')::boolean, false),
      coalesce((p_food->>'is_new')::boolean, false),
      coalesce((p_food->>'prep_time_minutes')::int, 15),
      coalesce(p_food->>'tags', '')
    )
    returning * into f;
  else
    update public.foods
    set
      name = coalesce(nullif(trim(p_food->>'name'), ''), name),
      slug = coalesce(nullif(trim(p_food->>'slug'), ''), slug),
      description = case
        when p_food ? 'description' then nullif(p_food->>'description', '')
        else description
      end,
      image = case
        when p_food ? 'image' then nullif(p_food->>'image', '')
        else image
      end,
      category_id = coalesce(nullif(p_food->>'category_id', '')::uuid, category_id),
      is_available = coalesce((p_food->>'is_available')::boolean, is_available),
      is_popular = coalesce((p_food->>'is_popular')::boolean, is_popular),
      is_new = coalesce((p_food->>'is_new')::boolean, is_new),
      prep_time_minutes = coalesce((p_food->>'prep_time_minutes')::int, prep_time_minutes),
      tags = coalesce(p_food->>'tags', tags),
      updated_at = now()
    where id = v_id
    returning * into f;

    if not found then
      raise exception 'Food not found';
    end if;
  end if;

  if jsonb_typeof(p_food->'portions') = 'array' then
    delete from public.food_portions where food_id = f.id;
    for v_portion in select * from jsonb_array_elements(p_food->'portions')
    loop
      insert into public.food_portions (food_id, portion_name, price, is_available)
      values (
        f.id,
        coalesce(nullif(trim(v_portion->>'portion_name'), ''), 'Medium'),
        coalesce((v_portion->>'price')::double precision, 0),
        coalesce((v_portion->>'is_available')::boolean, true)
      );
    end loop;
  elsif p_food ? 'price' then
    select id into v_portion_id
    from public.food_portions
    where food_id = f.id
    order by portion_name
    limit 1;

    if v_portion_id is null then
      insert into public.food_portions (food_id, portion_name, price, is_available)
      values (f.id, 'Medium', v_price, true);
    else
      update public.food_portions set price = v_price where id = v_portion_id;
    end if;
  elsif not exists (select 1 from public.food_portions where food_id = f.id) then
    insert into public.food_portions (food_id, portion_name, price, is_available)
    values (f.id, 'Medium', v_price, true);
  end if;

  select c.name, c.slug into v_cat_name, v_cat_slug
  from public.categories c
  where c.id = f.category_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'portion_name', p.portion_name,
        'price', p.price,
        'is_available', p.is_available
      )
      order by p.portion_name
    ),
    '[]'::jsonb
  )
  into v_portions
  from public.food_portions p
  where p.food_id = f.id;

  return jsonb_build_object(
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
      'name', coalesce(v_cat_name, 'Uncategorized'),
      'slug', coalesce(v_cat_slug, 'uncategorized')
    ),
    'food_portions', v_portions
  );
end;
$$;

create or replace function public.admin_delete_food(p_admin_token text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  begin
    delete from public.foods where id = p_id;
    if not found then
      raise exception 'Food not found';
    end if;
    return jsonb_build_object('archived', false);
  exception
    when foreign_key_violation then
      update public.foods
      set is_available = false, updated_at = now()
      where id = p_id;
      return jsonb_build_object('archived', true);
  end;
end;
$$;

create or replace function public.admin_update_site_content(p_admin_token text, p_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'Invalid content';
  end if;

  insert into public.site_settings (id, content, updated_at)
  values ('main', p_content, now())
  on conflict (id) do update set
    content = excluded.content,
    updated_at = now();

  return p_content;
end;
$$;

create or replace function public.admin_import_flyer_menu(
  p_admin_token text,
  p_categories jsonb,
  p_foods jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat jsonb;
  v_food jsonb;
  v_cat_row jsonb;
  v_cat_map jsonb := '{}'::jsonb;
  v_slug text;
  v_cats_n int := 0;
  v_foods_n int := 0;
begin
  perform public.require_admin_token(p_admin_token);
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_foods) <> 'array' then
    raise exception 'categories and foods must be arrays';
  end if;

  for v_cat in select * from jsonb_array_elements(p_categories)
  loop
    v_cat_row := public.admin_upsert_category(p_admin_token, v_cat);
    v_slug := v_cat_row->>'slug';
    v_cat_map := v_cat_map || jsonb_build_object(v_slug, v_cat_row->>'id');
    v_cats_n := v_cats_n + 1;
  end loop;

  for v_food in select * from jsonb_array_elements(p_foods)
  loop
    v_slug := coalesce(v_food->>'category_slug', '');
    perform public.admin_upsert_food(
      p_admin_token,
      v_food || jsonb_build_object('category_id', v_cat_map->>v_slug)
    );
    v_foods_n := v_foods_n + 1;
  end loop;

  return jsonb_build_object(
    'categories', v_cats_n,
    'foods', v_foods_n
  );
end;
$$;

grant execute on function public.admin_list_orders(text, int) to anon, authenticated;
grant execute on function public.admin_update_order_status(text, uuid, public.order_status) to anon, authenticated;
grant execute on function public.admin_order_stats(text) to anon, authenticated;
grant execute on function public.admin_visitor_stats(text, int) to anon, authenticated;
grant execute on function public.admin_active_sessions(text, int) to anon, authenticated;
grant execute on function public.admin_recent_page_views(text, int) to anon, authenticated;
grant execute on function public.admin_clear_site_visits(text) to anon, authenticated;
grant execute on function public.admin_update_site_settings(text, boolean, text) to anon, authenticated;
grant execute on function public.admin_list_categories(text) to anon, authenticated;
grant execute on function public.admin_upsert_category(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_category(text, uuid) to anon, authenticated;
grant execute on function public.admin_list_foods(text) to anon, authenticated;
grant execute on function public.admin_upsert_food(text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_food(text, uuid) to anon, authenticated;
grant execute on function public.admin_update_site_content(text, jsonb) to anon, authenticated;
grant execute on function public.admin_import_flyer_menu(text, jsonb, jsonb) to anon, authenticated;

-- Tighten storage: keep public read + insert, remove open delete/update for anon spam/wipe
drop policy if exists "Anyone update food images" on storage.objects;
drop policy if exists "Anyone delete food images" on storage.objects;
drop policy if exists "Anyone update category images" on storage.objects;
drop policy if exists "Anyone delete category images" on storage.objects;
