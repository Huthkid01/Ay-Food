-- First hero slide: “Welcome to” (white) + “Ay Food Palace” (gold highlight)

update public.site_settings
set
  content = jsonb_set(
    content,
    '{heroSlides}',
    (
      select coalesce(
        jsonb_agg(
          case
            when ord = 1
              and lower(trim(coalesce(slide->>'title', ''))) in (
                'ay food',
                'ay',
                'ay food palace',
                'welcome to ay food palace'
              )
              and coalesce(trim(slide->>'highlight'), '') = ''
            then slide
              || jsonb_build_object('title', 'Welcome to', 'highlight', 'Ay Food Palace')
            else slide
          end
          order by ord
        ),
        content->'heroSlides'
      )
      from jsonb_array_elements(content->'heroSlides') with ordinality as t(slide, ord)
    )
  ),
  updated_at = now()
where id = 'main'
  and jsonb_typeof(content->'heroSlides') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(content->'heroSlides') with ordinality as t(slide, ord)
    where ord = 1
      and lower(trim(coalesce(slide->>'title', ''))) in (
        'ay food',
        'ay',
        'ay food palace',
        'welcome to ay food palace'
      )
      and coalesce(trim(slide->>'highlight'), '') = ''
  );
