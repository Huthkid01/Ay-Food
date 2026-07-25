-- Switch admin login email to business inbox; keep same password (bcrypt).
update public.admin_credentials
set
  email = 'contact@ayfoodpalace.com',
  password_hash = extensions.crypt('Ayfoodpalace2026#', extensions.gen_salt('bf')),
  updated_at = now()
where id = 'main';

-- Force re-login with the new email
delete from public.admin_sessions;

-- Keep footer / contact email in site content in sync when content exists
update public.site_settings
set content = jsonb_set(
  jsonb_set(
    jsonb_set(
      coalesce(content, '{}'::jsonb),
      '{restaurant,email}',
      '"contact@ayfoodpalace.com"'::jsonb,
      true
    ),
    '{terms,contactEmail}',
    '"contact@ayfoodpalace.com"'::jsonb,
    true
  ),
  '{support,cards}',
  (
    select coalesce(
      jsonb_agg(
        case
          when lower(coalesce(card->>'title', '')) = 'email'
            then jsonb_set(card, '{href}', '"mailto:contact@ayfoodpalace.com"'::jsonb)
          else card
        end
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(coalesce(content->'support'->'cards', '[]'::jsonb)) as card
  ),
  true
)
where id = 'main'
  and content is not null
  and content <> '{}'::jsonb;
