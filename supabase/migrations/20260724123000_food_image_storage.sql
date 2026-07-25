-- Food image uploads (public bucket, Nexlogs-style)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-images',
  'food-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'category-images',
  'category-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = true;

-- Allow public read
create policy "Public read food images"
  on storage.objects for select
  using (bucket_id = 'food-images');

create policy "Public read category images"
  on storage.objects for select
  using (bucket_id = 'category-images');

-- Allow uploads (anon + authenticated) for admin demo / staff
create policy "Anyone upload food images"
  on storage.objects for insert
  with check (bucket_id = 'food-images');

create policy "Anyone update food images"
  on storage.objects for update
  using (bucket_id = 'food-images');

create policy "Anyone delete food images"
  on storage.objects for delete
  using (bucket_id = 'food-images');

create policy "Anyone upload category images"
  on storage.objects for insert
  with check (bucket_id = 'category-images');

create policy "Anyone update category images"
  on storage.objects for update
  using (bucket_id = 'category-images');

create policy "Anyone delete category images"
  on storage.objects for delete
  using (bucket_id = 'category-images');
