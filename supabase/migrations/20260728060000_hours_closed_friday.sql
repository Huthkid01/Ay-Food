-- Opening hours: 8:00 AM – 10:00 PM, closed Fridays

update public.site_settings
set
  content = jsonb_set(
    content,
    '{restaurant,hours}',
    to_jsonb('Mon–Thu, Sat–Sun · 8:00 AM – 10:00 PM (Closed Fridays)'::text)
  ),
  updated_at = now()
where id = 'main'
  and content ? 'restaurant';
