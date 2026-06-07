-- =============================================================================
-- Smoke Something BBQ dApp — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Then set your owner email in the `admins` insert near the bottom.
-- =============================================================================

-- ---------- PROFILES (one row per signed-in user) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  wallet_address text,
  points integer not null default 0,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a new auth user is created.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, split_part(coalesce(new.email,''), '@', 1))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- MENU ----------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  description text default '',
  price numeric(10,2),          -- nullable: price can be "TBD"
  available boolean default true,
  sort_order int default 0,
  image_url text,               -- uploaded item photo (Supabase Storage URL)
  created_at timestamptz default now()
);
-- If you already ran an older version of this file:
alter table menu_items add column if not exists image_url text;

-- ---------- REVIEWS (5-star rating + comment per menu item) ----------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid references menu_items(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text,
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now()
);
create index if not exists reviews_item_idx on reviews(menu_item_id);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null, -- null = guest
  guest_name text,
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  status text not null default 'pending',  -- pending|paid|fulfilled|cancelled
  payment_method text,                     -- cash|cashapp|paypal|venmo|crypto|gateway
  points_awarded int default 0,
  claim_token text,                        -- random token embedded in the cash QR
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists orders_claim_token_idx on orders(claim_token);
create index if not exists orders_status_idx on orders(status);

-- ---------- BUSINESS SETTINGS (singleton row id=1) ----------
create table if not exists business_settings (
  id int primary key default 1,
  location_lat double precision,
  location_lng double precision,
  location_enabled boolean default false,
  updated_at timestamptz default now(),
  constraint singleton check (id = 1)
);
insert into business_settings (id) values (1) on conflict (id) do nothing;

-- ---------- ADMINS (who can manage the business) ----------
create table if not exists admins ( email text primary key );

create or replace function is_admin() returns boolean
language sql stable as $$
  select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table profiles          enable row level security;
alter table menu_items        enable row level security;
alter table orders            enable row level security;
alter table business_settings enable row level security;
alter table admins            enable row level security;
alter table reviews           enable row level security;

-- profiles: user manages own row; admin can read all
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
  for all using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

-- menu: anyone can read; only admin writes
drop policy if exists menu_read on menu_items;
create policy menu_read on menu_items for select using (true);
drop policy if exists menu_write on menu_items;
create policy menu_write on menu_items for all using (is_admin()) with check (is_admin());

-- orders: anyone (incl. guests/anon) may create; user reads own; admin reads/updates all
drop policy if exists orders_insert on orders;
create policy orders_insert on orders
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists orders_select on orders;
create policy orders_select on orders
  for select using (auth.uid() = user_id or is_admin());
drop policy if exists orders_update on orders;
create policy orders_update on orders
  for update using (is_admin()) with check (is_admin());

-- settings: anyone reads (customers need the location); admin writes
drop policy if exists settings_read on business_settings;
create policy settings_read on business_settings for select using (true);
drop policy if exists settings_write on business_settings;
create policy settings_write on business_settings for all using (is_admin()) with check (is_admin());

-- reviews: anyone reads; signed-in users post their own; admin can moderate/delete
drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (true);
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews
  for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists reviews_delete on reviews;
create policy reviews_delete on reviews
  for delete using (auth.uid() = user_id or is_admin());

-- admins table: readable by admins only
drop policy if exists admins_read on admins;
create policy admins_read on admins for select using (is_admin());

-- =============================================================================
-- SEED MENU (edit prices later in the owner dashboard)
-- =============================================================================
insert into menu_items (category, name, description, price, sort_order) values
  ('Plates', 'Smoked Brisket Plate', 'Slow-smoked brisket with two sides', 18.00, 1),
  ('Plates', 'Chicken Plate',        'Smoked chicken with two sides',      null, 2),
  ('Ribs',   'Ribs',                 'Smoked pork ribs',                   null, 1),
  ('Sides',  'Potato Salad',         'House-made potato salad',            null, 1),
  ('Sides',  'Corn',                 'Sweet corn',                         null, 2)
on conflict do nothing;

-- =============================================================================
-- STORAGE: public bucket for menu item photos
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

drop policy if exists "menu images read" on storage.objects;
create policy "menu images read" on storage.objects
  for select using (bucket_id = 'menu-images');
drop policy if exists "menu images admin insert" on storage.objects;
create policy "menu images admin insert" on storage.objects
  for insert with check (bucket_id = 'menu-images' and is_admin());
drop policy if exists "menu images admin update" on storage.objects;
create policy "menu images admin update" on storage.objects
  for update using (bucket_id = 'menu-images' and is_admin());
drop policy if exists "menu images admin delete" on storage.objects;
create policy "menu images admin delete" on storage.objects
  for delete using (bucket_id = 'menu-images' and is_admin());

-- =============================================================================
-- !!! SET YOUR OWNER EMAIL HERE (the account that gets the dashboard) !!!
-- insert into admins (email) values ('you@example.com') on conflict do nothing;
-- =============================================================================
