-- Remove a visitor session (used when admin logs in so staff never appear in Site Visits).
create or replace function public.admin_purge_visitor_session(
  p_admin_token text,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sid text := nullif(trim(coalesce(p_session_id, '')), '');
  v_views int := 0;
  v_sessions int := 0;
begin
  perform public.require_admin_token(p_admin_token);
  if v_sid is null or length(v_sid) < 8 then
    return jsonb_build_object('purged', false, 'reason', 'invalid_session');
  end if;

  delete from public.site_page_views where session_id = v_sid;
  get diagnostics v_views = row_count;
  delete from public.site_sessions where session_id = v_sid;
  get diagnostics v_sessions = row_count;

  return jsonb_build_object(
    'purged', true,
    'deletedPageViews', v_views,
    'deletedSessions', v_sessions
  );
end;
$$;

grant execute on function public.admin_purge_visitor_session(text, text) to anon, authenticated;
