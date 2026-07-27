-- Admin-configurable delivery fee (used at checkout).

alter table public.site_settings
  add column if not exists delivery_fee double precision not null default 1500;

comment on column public.site_settings.delivery_fee is
  'NGN delivery fee charged when customer chooses delivery at checkout.';

-- Keep restaurant_settings in sync as a fallback for older code paths
update public.restaurant_settings rs
set default_delivery_fee = coalesce(
  (select s.delivery_fee from public.site_settings s where s.id = 'main'),
  1500
);

drop function if exists public.admin_update_site_settings(text, boolean, text);

create or replace function public.admin_update_site_settings(
  p_admin_token text,
  p_maintenance_enabled boolean,
  p_maintenance_message text,
  p_delivery_fee double precision default null
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
begin
  perform public.require_admin_token(p_admin_token);

  if length(v_msg) > 1000 then
    v_msg := left(v_msg, 1000);
  end if;

  select delivery_fee into v_fee
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

  insert into public.site_settings (
    id,
    maintenance_enabled,
    maintenance_message,
    delivery_fee,
    updated_at
  )
  values (
    'main',
    coalesce(p_maintenance_enabled, false),
    v_msg,
    v_fee,
    now()
  )
  on conflict (id) do update set
    maintenance_enabled = excluded.maintenance_enabled,
    maintenance_message = excluded.maintenance_message,
    delivery_fee = excluded.delivery_fee,
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
    'delivery_fee', v_row.delivery_fee
  );
end;
$$;

grant execute on function public.admin_update_site_settings(text, boolean, text, double precision)
  to anon, authenticated;
