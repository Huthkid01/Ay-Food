-- Orders: DB-first RPCs (Nexlogs-style) so guest checkout + admin work without Prisma / localStorage.
-- Admin UI uses env login (not Supabase Auth yet), so list/update are security-definer RPCs.

-- Allow bank transfer as payment provider (used for metadata / future payments row)
do $$
begin
  alter type public.payment_provider add value if not exists 'BANK_TRANSFER';
exception
  when duplicate_object then null;
  when others then null;
end $$;

create or replace function public.create_guest_order(
  p_order_number text,
  p_order_type public.order_type,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_subtotal double precision,
  p_tax double precision,
  p_delivery_fee double precision,
  p_total double precision,
  p_items jsonb,
  p_delivery_address text default null,
  p_delivery_instructions text default null,
  p_discount double precision default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_food_id uuid;
begin
  if p_order_number is null or length(trim(p_order_number)) < 4 then
    raise exception 'Invalid order number' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  select id into v_restaurant_id
  from public.restaurants
  where slug = 'ay-food'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  insert into public.orders (
    order_number,
    restaurant_id,
    status,
    order_type,
    subtotal,
    tax,
    delivery_fee,
    discount,
    total,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    delivery_instructions
  )
  values (
    trim(p_order_number),
    v_restaurant_id,
    'RECEIVED',
    p_order_type,
    p_subtotal,
    p_tax,
    p_delivery_fee,
    coalesce(p_discount, 0),
    p_total,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(lower(p_customer_email)),
    nullif(trim(coalesce(p_delivery_address, '')), ''),
    nullif(trim(coalesce(p_delivery_instructions, '')), '')
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) as t(value)
  loop
    v_food_id := null;
    if (v_item->>'food_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_food_id := (v_item->>'food_id')::uuid;
    end if;

    insert into public.order_items (
      order_id,
      food_id,
      food_name,
      portion_name,
      quantity,
      unit_price,
      total_price,
      notes,
      pack_name
    )
    values (
      v_order.id,
      v_food_id,
      coalesce(nullif(trim(v_item->>'food_name'), ''), 'Item'),
      coalesce(nullif(trim(v_item->>'portion_name'), ''), 'Standard'),
      greatest(1, coalesce((v_item->>'quantity')::int, 1)),
      coalesce((v_item->>'unit_price')::double precision, 0),
      coalesce(
        (v_item->>'total_price')::double precision,
        coalesce((v_item->>'unit_price')::double precision, 0)
          * greatest(1, coalesce((v_item->>'quantity')::int, 1))
      ),
      nullif(trim(coalesce(v_item->>'notes', '')), ''),
      nullif(trim(coalesce(v_item->>'pack_name', '')), '')
    );
  end loop;

  insert into public.order_status_history (order_id, status, note)
  values (v_order.id, 'RECEIVED', 'Customer confirmed bank transfer');

  -- Optional payment row (bank transfer)
  begin
    insert into public.payments (
      order_id,
      provider,
      amount,
      currency,
      status,
      reference
    )
    values (
      v_order.id,
      'BANK_TRANSFER',
      v_order.total,
      'NGN',
      'COMPLETED',
      'BANK-' || v_order.order_number
    );
  exception
    when others then
      -- Older DBs without BANK_TRANSFER enum — skip payment row
      null;
  end;

  return to_jsonb(v_order);
end;
$$;

create or replace function public.get_order_by_number(p_order_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_history jsonb;
begin
  if p_order_number is null or length(trim(p_order_number)) < 4 then
    return null;
  end if;

  select * into v_order
  from public.orders
  where upper(order_number) = upper(trim(p_order_number))
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
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
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items i
  where i.order_id = v_order.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'status', h.status,
        'note', h.note,
        'created_at', h.created_at
      )
      order by h.created_at
    ),
    '[]'::jsonb
  )
  into v_history
  from public.order_status_history h
  where h.order_id = v_order.id;

  return to_jsonb(v_order)
    || jsonb_build_object('order_items', v_items, 'order_status_history', v_history);
end;
$$;

create or replace function public.admin_list_orders(p_limit int default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
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

create or replace function public.admin_order_stats()
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

grant execute on function public.create_guest_order(
  text, public.order_type, text, text, text,
  double precision, double precision, double precision, double precision, jsonb,
  text, text, double precision
) to anon, authenticated;

grant execute on function public.get_order_by_number(text) to anon, authenticated;
grant execute on function public.admin_list_orders(int) to anon, authenticated;
grant execute on function public.admin_update_order_status(uuid, public.order_status) to anon, authenticated;
grant execute on function public.admin_order_stats() to anon, authenticated;
