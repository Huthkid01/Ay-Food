-- Lock admin login to the configured owner email only
update public.admin_credentials
set
  email = 'admin@ayfoodpalace.com',
  updated_at = now()
where id = 'main';

delete from public.admin_sessions;
