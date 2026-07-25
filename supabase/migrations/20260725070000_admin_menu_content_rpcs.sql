-- Admin menu + site content RPCs for env-password admin (anon key).
-- Mirrors admin_list_orders / admin_update_site_settings pattern.

create or replace function public.admin_list_categories()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
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

create or replace function public.admin_upsert_category(p_category jsonb)
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
begin
  select id into v_restaurant_id from public.restaurants where slug = 'ay-food' limit 1;
  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_id := nullif(p_category->>'id', '')::uuid;

  if v_id is null then
    insert into public.categories (
      name, slug, description, image, sort_order, is_active, restaurant_id
    ) values (
      coalesce(nullif(trim(p_category->>'name'), ''), 'Category'),
      coalesce(nullif(trim(p_category->>'slug'), ''), 'category'),
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
      slug = coalesce(nullif(trim(p_category->>'slug'), ''), slug),
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

create or replace function public.admin_delete_category(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.categories where id = p_id;
  if not found then
    raise exception 'Category not found';
  end if;
  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.admin_list_foods()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
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

create or replace function public.admin_upsert_food(p_food jsonb)
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
begin
  select id into v_restaurant_id from public.restaurants where slug = 'ay-food' limit 1;
  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_id := nullif(p_food->>'id', '')::uuid;
  v_price := coalesce((p_food->>'price')::double precision, 0);

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

    insert into public.food_portions (food_id, portion_name, price, is_available)
    values (f.id, 'Medium', v_price, true);
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

    if p_food ? 'price' then
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
    end if;
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

create or replace function public.admin_delete_food(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
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

create or replace function public.admin_update_site_content(p_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
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

grant execute on function public.admin_list_categories() to anon, authenticated;
grant execute on function public.admin_upsert_category(jsonb) to anon, authenticated;
grant execute on function public.admin_delete_category(uuid) to anon, authenticated;
grant execute on function public.admin_list_foods() to anon, authenticated;
grant execute on function public.admin_upsert_food(jsonb) to anon, authenticated;
grant execute on function public.admin_delete_food(uuid) to anon, authenticated;
grant execute on function public.admin_update_site_content(jsonb) to anon, authenticated;
