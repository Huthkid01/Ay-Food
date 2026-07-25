-- Clear all orders (cascade deletes items, payments, status history)
create or replace function public.admin_clear_orders(p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  perform public.require_admin_token(p_admin_token);
  select count(*)::int into v_count from public.orders;
  delete from public.orders where id is not null;
  return jsonb_build_object('cleared', true, 'deletedOrders', v_count);
end;
$$;

grant execute on function public.admin_clear_orders(text) to anon, authenticated;
