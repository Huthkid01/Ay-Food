-- Full menu import + multi-portion support for env-admin (anon key).

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
  v_portion jsonb;
begin
  select id into v_restaurant_id from public.restaurants where slug = 'ay-food' limit 1;
  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_id := nullif(p_food->>'id', '')::uuid;
  v_price := coalesce((p_food->>'price')::double precision, 0);

  if v_id is null then
    -- Prefer match by slug so re-import updates instead of duplicating
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

  -- Full portion replace when portions array provided
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
  v_slug text;
begin
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

create or replace function public.admin_import_flyer_menu(p_categories jsonb, p_foods jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat jsonb;
  v_food jsonb;
  v_cat_row jsonb;
  v_food_row jsonb;
  v_cat_map jsonb := '{}'::jsonb;
  v_slug text;
  v_cats_n int := 0;
  v_foods_n int := 0;
begin
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_foods) <> 'array' then
    raise exception 'categories and foods must be arrays';
  end if;

  for v_cat in select * from jsonb_array_elements(p_categories)
  loop
    v_cat_row := public.admin_upsert_category(v_cat);
    v_slug := v_cat_row->>'slug';
    v_cat_map := v_cat_map || jsonb_build_object(v_slug, v_cat_row->>'id');
    v_cats_n := v_cats_n + 1;
  end loop;

  for v_food in select * from jsonb_array_elements(p_foods)
  loop
    v_slug := coalesce(v_food->>'category_slug', '');
    v_food_row := public.admin_upsert_food(
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

grant execute on function public.admin_import_flyer_menu(jsonb, jsonb) to anon, authenticated;
