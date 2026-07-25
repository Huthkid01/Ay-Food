-- Keep storefront address in sync with Omoleye bustop location
update public.site_settings
set content = jsonb_set(
  coalesce(content, '{}'::jsonb),
  '{restaurant,address}',
  '"Omoleye bustop, Ogijo, Ikorodu–Shagamu Road"'::jsonb,
  true
)
where id = 'main';
