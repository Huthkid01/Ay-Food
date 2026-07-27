-- Kora Pay: pending guest orders + complete payment RPC

do $$
begin
  alter type public.payment_provider add value if not exists 'KORA';
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- Create order with PENDING Kora payment (order appears only after pay is confirmed in admin UX via payment status)
create or replace function public.create_guest_order_awaiting_kora(
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
  p_discount double precision default 0,
  p_payment_reference text default null
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
  v_reference text;
begin
  if p_order_number is null or length(trim(p_order_number)) < 4 then
    raise exception 'Invalid order number' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'Invalid order total' using errcode = '22023';
  end if;

  select id into v_restaurant_id
  from public.restaurants
  where slug = 'ay-food'
  limit 1;

  if v_restaurant_id is null then
    raise exception 'Restaurant not found';
  end if;

  v_reference := coalesce(
    nullif(trim(p_payment_reference), ''),
    'KORA-' || replace(gen_random_uuid()::text, '-', '')
  );

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
  values (v_order.id, 'RECEIVED', 'Awaiting Kora payment');

  insert into public.payments (
    order_id,
    provider,
    amount,
    currency,
    status,
    reference,
    metadata
  )
  values (
    v_order.id,
    'KORA',
    v_order.total,
    'NGN',
    'PENDING',
    v_reference,
    jsonb_build_object('source', 'ay-food-checkout')
  );

  return jsonb_build_object(
    'order', to_jsonb(v_order),
    'payment_reference', v_reference
  );
end;
$$;

grant execute on function public.create_guest_order_awaiting_kora(
  text, public.order_type, text, text, text,
  double precision, double precision, double precision, double precision,
  jsonb, text, text, double precision, text
) to anon, authenticated;

-- Mark Kora payment complete (idempotent). Returns full order + items for emails.
create or replace function public.complete_kora_order_payment(
  p_reference text,
  p_provider_ref text default null,
  p_provider_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_items jsonb;
  v_already boolean := false;
begin
  if p_reference is null or length(trim(p_reference)) < 4 then
    raise exception 'Invalid payment reference' using errcode = '22023';
  end if;

  select * into v_payment
  from public.payments
  where reference = trim(p_reference)
    and provider = 'KORA'
  limit 1;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status = 'COMPLETED' then
    v_already := true;
  else
    update public.payments
    set
      status = 'COMPLETED',
      provider_ref = coalesce(nullif(trim(p_provider_ref), ''), provider_ref),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_provider_metadata, '{}'::jsonb)
        || jsonb_build_object('completed_at', now()),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;

    insert into public.order_status_history (order_id, status, note)
    values (v_payment.order_id, 'RECEIVED', 'Paid via Kora');
  end if;

  select * into v_order from public.orders where id = v_payment.order_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'food_name', oi.food_name,
        'portion_name', oi.portion_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price,
        'pack_name', oi.pack_name
      )
      order by oi.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'already_completed', v_already,
    'email_sent', coalesce((v_payment.metadata->>'email_sent')::boolean, false),
    'payment_id', v_payment.id,
    'payment_reference', v_payment.reference,
    'order', to_jsonb(v_order),
    'items', v_items
  );
end;
$$;

grant execute on function public.complete_kora_order_payment(text, text, jsonb) to service_role;

-- Mark that customer/admin emails were sent (idempotent flag)
create or replace function public.mark_kora_payment_email_sent(p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
  set
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('email_sent', true, 'email_sent_at', now()),
    updated_at = now()
  where reference = trim(p_reference)
    and provider = 'KORA';
end;
$$;

grant execute on function public.mark_kora_payment_email_sent(text) to service_role;
