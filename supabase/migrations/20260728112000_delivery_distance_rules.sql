-- Distance-based delivery fee rules configurable by admin.

alter table public.site_settings
  add column if not exists delivery_rules jsonb not null default '{}'::jsonb;

comment on column public.site_settings.delivery_rules is
  'Distance-based delivery fee rules (origin coords, km bands, manual-quote threshold).';

update public.site_settings
set delivery_rules = jsonb_build_object(
  'origin', jsonb_build_object(
    'label', 'Omoleye bustop, Ogijo',
    'lat', 6.6977251,
    'lon', 3.5119394
  ),
  'bands', jsonb_build_array(
    jsonb_build_object('minKm', 0, 'maxKm', 2.5, 'fee', 1200, 'requiresConfirm', false),
    jsonb_build_object('minKm', 2.5, 'maxKm', 5, 'fee', 1500, 'requiresConfirm', false),
    jsonb_build_object('minKm', 5, 'maxKm', 8, 'fee', 2000, 'requiresConfirm', false),
    jsonb_build_object('minKm', 8, 'maxKm', 12, 'fee', 2800, 'requiresConfirm', false),
    jsonb_build_object('minKm', 12, 'maxKm', 18, 'fee', 4000, 'requiresConfirm', true)
  ),
  'specialOrderMinKm', 18,
  'specialOrderNote',
    'Special delivery only. Please call or WhatsApp us to confirm delivery fee before payment.'
)
where id = 'main'
  and (
    delivery_rules is null
    or delivery_rules = '{}'::jsonb
    or jsonb_typeof(delivery_rules->'bands') is distinct from 'array'
  );

drop function if exists public.admin_update_site_settings(text, boolean, text, double precision);

create or replace function public.admin_update_site_settings(
  p_admin_token text,
  p_maintenance_enabled boolean,
  p_maintenance_message text,
  p_delivery_fee double precision default null,
  p_delivery_rules jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.site_settings%rowtype;
  v_msg text := coalesce(
    nullif(trim(p_maintenance_message), ''),
    'We are closed today. Check back tomorrow.'
  );
  v_fee double precision;
  v_rules jsonb;
begin
  perform public.require_admin_token(p_admin_token);

  if length(v_msg) > 1000 then
    v_msg := left(v_msg, 1000);
  end if;

  select delivery_fee, delivery_rules into v_fee, v_rules
  from public.site_settings
  where id = 'main';

  v_fee := coalesce(p_delivery_fee, v_fee, 1500);
  if v_fee is null or v_fee < 0 then
    raise exception 'Delivery fee must be 0 or greater' using errcode = '22023';
  end if;
  if v_fee > 1000000 then
    raise exception 'Delivery fee is too high' using errcode = '22023';
  end if;
  v_fee := round(v_fee::numeric, 2);

  v_rules := coalesce(p_delivery_rules, v_rules, '{}'::jsonb);
  if jsonb_typeof(v_rules) is distinct from 'object' then
    raise exception 'delivery_rules must be a JSON object' using errcode = '22023';
  end if;

  insert into public.site_settings (
    id,
    maintenance_enabled,
    maintenance_message,
    delivery_fee,
    delivery_rules,
    updated_at
  )
  values (
    'main',
    coalesce(p_maintenance_enabled, false),
    v_msg,
    v_fee,
    v_rules,
    now()
  )
  on conflict (id) do update set
    maintenance_enabled = excluded.maintenance_enabled,
    maintenance_message = excluded.maintenance_message,
    delivery_fee = excluded.delivery_fee,
    delivery_rules = excluded.delivery_rules,
    updated_at = now()
  returning * into v_row;

  update public.restaurant_settings
  set default_delivery_fee = v_row.delivery_fee
  where restaurant_id = (
    select id from public.restaurants where slug = 'ay-food' limit 1
  );

  return jsonb_build_object(
    'maintenance_enabled', v_row.maintenance_enabled,
    'maintenance_message', v_row.maintenance_message,
    'delivery_fee', v_row.delivery_fee,
    'delivery_rules', v_row.delivery_rules
  );
end;
$$;

grant execute on function public.admin_update_site_settings(text, boolean, text, double precision, jsonb)
  to anon, authenticated;
