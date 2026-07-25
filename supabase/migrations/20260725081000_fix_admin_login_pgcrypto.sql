-- Fix pgcrypto calls to use extensions schema (Supabase)

create or replace function public.admin_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_cred public.admin_credentials%rowtype;
  v_token text;
begin
  if length(v_email) < 3 or p_password is null or length(p_password) < 8 then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  select * into v_cred from public.admin_credentials where id = 'main' limit 1;
  if not found then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  if lower(v_cred.email) <> v_email
     or v_cred.password_hash <> crypt(p_password, v_cred.password_hash) then
    raise exception 'Invalid email or password' using errcode = '28P01';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.admin_sessions (token, email, expires_at)
  values (v_token, v_email, now() + interval '24 hours');

  delete from public.admin_sessions where expires_at < now() - interval '7 days';

  return jsonb_build_object(
    'token', v_token,
    'email', v_email,
    'expiresAt', (now() + interval '24 hours')
  );
end;
$$;

-- Ensure credentials hash is valid (extensions schema required at statement level)
update public.admin_credentials
set password_hash = extensions.crypt('Ayfoodpalace2026#', extensions.gen_salt('bf')),
    updated_at = now()
where id = 'main';
