-- About copy should match the real menu (no pepper soup)
update public.site_settings
set content = jsonb_set(
  coalesce(content, '{}'::jsonb),
  '{about,paragraphs}',
  '[
    "A.Y Food Mega Palace in Ogijo, Ikorodu is built around custom meal packs. Choose your swallow (Amala, Eba, Semo, or Pounded Yam), pair it with soups like Ewedu, Gbegiri, Egusi, Okro, or Efo Riro, and add the protein you want — goat meat, beef, chicken, turkey, fish, and more.",
    "Our meals also include Jollof Rice, Fried Rice, Ofada Rice, Special Rice, beans, spaghetti, and yam dishes, plus sides like plantain, moi moi, and salad. Order online, build your pack, and enjoy delivery or pickup — no account needed.",
    "Find us at Omoleye bustop, Ogijo, along the Ikorodu–Shagamu Road. We look forward to welcoming you."
  ]'::jsonb,
  true
)
where id = 'main';
