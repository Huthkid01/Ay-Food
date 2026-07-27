-- Include payment status on admin order list so owners see Paid / Awaiting payment.
-- Stats count only paid (COMPLETED) orders so abandoned Kora checkouts don't inflate revenue.

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
              ),
              'payment_status', p.status,
              'payment_provider', p.provider,
              'payment_amount', p.amount,
              'payment_reference', p.reference,
              'payment_paid', (p.status = 'COMPLETED')
            )
          ) as row_json,
          o.created_at as sort_at
        from public.orders o
        left join lateral (
          select pay.status, pay.provider, pay.amount, pay.reference
          from public.payments pay
          where pay.order_id = o.id
          order by
            case when pay.status = 'COMPLETED' then 0 else 1 end,
            pay.created_at desc
          limit 1
        ) p on true
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
    'totalOrders', (
      select count(*)::int
      from public.orders o
      where o.status <> 'CANCELLED'
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ),
    'totalRevenue', coalesce((
      select sum(o.total)
      from public.orders o
      where o.status <> 'CANCELLED'
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ), 0),
    'todayOrders', (
      select count(*)::int
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_today
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ),
    'todayRevenue', coalesce((
      select sum(o.total)
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_today
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ), 0),
    'weekOrders', (
      select count(*)::int
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_week
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ),
    'weekRevenue', coalesce((
      select sum(o.total)
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_week
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ), 0),
    'monthOrders', (
      select count(*)::int
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_month
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ),
    'monthRevenue', coalesce((
      select sum(o.total)
      from public.orders o
      where o.status <> 'CANCELLED'
        and o.created_at >= v_month
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    ), 0),
    'totalCustomers', (
      select count(distinct lower(o.customer_email))::int
      from public.orders o
      where o.status <> 'CANCELLED'
        and exists (
          select 1 from public.payments pay
          where pay.order_id = o.id and pay.status = 'COMPLETED'
        )
    )
  );
end;
$$;
