-- OPay / bank transfer: orders await admin payment confirmation before email.

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
  values (
    v_order.id,
    'RECEIVED',
    'Customer confirmed OPay transfer — awaiting admin payment confirmation'
  );

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
      'PENDING',
      'OPAY-' || v_order.order_number
    );
  exception
    when others then
      null;
  end;

  return to_jsonb(v_order);
end;
$$;

-- Admin marks OPay / bank transfer as received → COMPLETED + RECEIVED + payload for email
create or replace function public.admin_confirm_payment_received(
  p_admin_token text,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_items jsonb;
  v_already boolean := false;
  v_email_sent boolean := false;
begin
  perform public.require_admin_token(p_admin_token);

  if p_order_id is null then
    raise exception 'Order id is required' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  select * into v_payment
  from public.payments
  where order_id = v_order.id
  order by created_at desc
  limit 1;

  if not found then
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
      'BANK_TRANSFER',
      v_order.total,
      'NGN',
      'COMPLETED',
      'OPAY-' || v_order.order_number,
      jsonb_build_object('confirmed_by', 'admin', 'confirmed_at', now())
    )
    returning * into v_payment;
  elsif v_payment.status = 'COMPLETED' then
    v_already := true;
    v_email_sent := coalesce((v_payment.metadata->>'email_sent')::boolean, false);
  else
    update public.payments
    set
      status = 'COMPLETED',
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('confirmed_by', 'admin', 'confirmed_at', now()),
      updated_at = now()
    where id = v_payment.id
    returning * into v_payment;
  end if;

  if v_order.status is distinct from 'RECEIVED'
     and v_order.status not in ('PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED') then
    update public.orders
    set status = 'RECEIVED', updated_at = now()
    where id = v_order.id
    returning * into v_order;
  elsif v_order.status = 'RECEIVED' then
    null;
  else
    -- Keep kitchen progress if already past RECEIVED
    select * into v_order from public.orders where id = p_order_id;
  end if;

  -- Ensure kitchen status is at least RECEIVED when payment is newly confirmed
  if not v_already then
    update public.orders
    set
      status = case
        when status in ('PREPARING', 'COOKING', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')
          then status
        else 'RECEIVED'
      end,
      updated_at = now()
    where id = v_order.id
    returning * into v_order;

    insert into public.order_status_history (order_id, status, note)
    values (v_order.id, v_order.status, 'Payment received (OPay / bank transfer confirmed by admin)');
  end if;

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
    'email_sent', v_email_sent,
    'payment_id', v_payment.id,
    'payment_reference', v_payment.reference,
    'order', to_jsonb(v_order),
    'items', v_items
  );
end;
$$;

create or replace function public.admin_mark_payment_email_sent(
  p_admin_token text,
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin_token(p_admin_token);

  update public.payments
  set
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object('email_sent', true, 'email_sent_at', now()),
    updated_at = now()
  where order_id = p_order_id;
end;
$$;

-- Include payment status on public track lookup
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
  v_payment public.payments%rowtype;
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

  select * into v_payment
  from public.payments
  where order_id = v_order.id
  order by created_at desc
  limit 1;

  return to_jsonb(v_order)
    || jsonb_build_object(
      'order_items', v_items,
      'order_status_history', v_history,
      'payment_status', case when found then v_payment.status::text else null end,
      'payment_provider', case when found then v_payment.provider::text else null end,
      'payment_amount', case when found then v_payment.amount else null end,
      'payment_reference', case when found then v_payment.reference else null end,
      'payment_paid', case when found then v_payment.status = 'COMPLETED' else false end
    );
end;
$$;

grant execute on function public.admin_confirm_payment_received(text, uuid) to anon, authenticated;
grant execute on function public.admin_mark_payment_email_sent(text, uuid) to anon, authenticated;
