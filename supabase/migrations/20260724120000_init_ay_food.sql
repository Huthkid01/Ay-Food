-- Ay Food initial schema (Nexlogs-style Supabase)
-- Push with: supabase db push   OR   supabase migration up

create extension if not exists "pgcrypto";

-- Roles for kitchen / admin
create type public.user_role as enum (
  'CUSTOMER',
  'OWNER',
  'MANAGER',
  'KITCHEN_STAFF',
  'CASHIER',
  'DELIVERY_STAFF'
);

create type public.order_status as enum (
  'RECEIVED',
  'PREPARING',
  'COOKING',
  'PACKING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED'
);

create type public.order_type as enum ('DELIVERY', 'PICKUP');

create type public.payment_status as enum (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED'
);

create type public.payment_provider as enum (
  'STRIPE',
  'FLUTTERWAVE',
  'PAYSTACK',
  'CASH'
);

-- Profiles linked to Supabase Auth
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  role public.user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  phone text,
  email text,
  address text,
  city text,
  tax_rate double precision not null default 7.5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants (id) on delete cascade,
  default_delivery_fee double precision not null default 1500,
  min_order_amount double precision not null default 2000,
  opening_time text not null default '08:00',
  closing_time text not null default '22:00'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  image text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  image text,
  category_id uuid not null references public.categories (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  calories int,
  prep_time_minutes int not null default 15,
  tags text not null default '',
  is_available boolean not null default true,
  is_popular boolean not null default false,
  is_new boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, slug)
);

create table public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  portion_name text not null default 'Medium',
  price double precision not null,
  calories int,
  is_available boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status public.order_status not null default 'RECEIVED',
  order_type public.order_type not null default 'DELIVERY',
  subtotal double precision not null,
  tax double precision not null,
  delivery_fee double precision not null default 0,
  discount double precision not null default 0,
  total double precision not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  delivery_address text,
  delivery_instructions text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null,
  portion_name text not null,
  quantity int not null default 1,
  unit_price double precision not null,
  total_price double precision not null,
  notes text,
  pack_name text
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider public.payment_provider not null,
  amount double precision not null,
  currency text not null default 'NGN',
  status public.payment_status not null default 'PENDING',
  reference text not null unique,
  provider_ref text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity double precision not null,
  unit text not null default 'kg',
  min_stock double precision not null default 10,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'CUSTOMER')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Seed restaurant
insert into public.restaurants (name, slug, description, phone, email, address, city)
values (
  'A.Y Food Mega Palace',
  'ay-food',
  'Authentic Nigerian cuisine in Ogijo, Ikorodu, Lagos',
  '+2348000000000',
  'hello@ayfood.ng',
  'Ogijo, Ikorodu',
  'Lagos'
);

insert into public.restaurant_settings (restaurant_id)
select id from public.restaurants where slug = 'ay-food';

-- RLS
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.categories enable row level security;
alter table public.foods enable row level security;
alter table public.food_portions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.inventory_items enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER', 'MANAGER', 'KITCHEN_STAFF', 'CASHIER', 'DELIVERY_STAFF')
  );
$$;

-- Public read menu
create policy "Public read restaurants" on public.restaurants for select using (true);
create policy "Public read settings" on public.restaurant_settings for select using (true);
create policy "Public read categories" on public.categories for select using (is_active = true or public.is_staff());
create policy "Public read foods" on public.foods for select using (is_available = true or public.is_staff());
create policy "Public read portions" on public.food_portions for select using (is_available = true or public.is_staff());

-- Profiles
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id or public.is_staff());
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Staff manage menu
create policy "Staff manage categories" on public.categories for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage foods" on public.foods for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage portions" on public.food_portions for all using (public.is_staff()) with check (public.is_staff());
create policy "Staff manage inventory" on public.inventory_items for all using (public.is_staff()) with check (public.is_staff());

-- Orders: anyone can insert (guest checkout); staff manage; customers read own email match is weak — use track by order_number via edge/RPC later
create policy "Anyone insert orders" on public.orders for insert with check (true);
create policy "Staff read orders" on public.orders for select using (public.is_staff());
create policy "Staff update orders" on public.orders for update using (public.is_staff());
create policy "Anyone insert order items" on public.order_items for insert with check (true);
create policy "Staff read order items" on public.order_items for select using (public.is_staff());
create policy "Anyone insert status history" on public.order_status_history for insert with check (true);
create policy "Staff read status history" on public.order_status_history for select using (public.is_staff());

create policy "Anyone insert payments" on public.payments for insert with check (true);
create policy "Staff read payments" on public.payments for select using (public.is_staff());

-- Realtime (Nexlogs-style live admin)
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.foods;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.payments;
