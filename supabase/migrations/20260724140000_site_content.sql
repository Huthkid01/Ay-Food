-- Site content CMS (hero, restaurant info, homepage copy) stored on site_settings
alter table public.site_settings
  add column if not exists content jsonb not null default '{}'::jsonb;

comment on column public.site_settings.content is
  'Editable website content: restaurant, heroSlides, home, banner, menuPage, buildPage';
