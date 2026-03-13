-- Baby Shop POS Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
  id uuid references auth.users not null primary key,
  nama text not null,
  email text not null,
  role text not null check (role in ('admin', 'kasir')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for users
alter table public.users enable row level security;
create policy "Users can view their own profile." on public.users for select using (auth.uid() = id);
create policy "Admins can view all profiles." on public.users for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- CATEGORIES TABLE
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  nama text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for categories
alter table public.categories enable row level security;
create policy "Anyone can view categories." on public.categories for select using (true);
create policy "Admins can manage categories." on public.categories for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- PRODUCTS TABLE
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  nama_produk text not null,
  kategori_id uuid references public.categories(id),
  harga_beli numeric not null default 0 check (harga_beli >= 0),
  harga_jual numeric not null check (harga_jual >= 0),
  stok integer not null default 0 check (stok >= 0),
  barcode text unique,
  gambar text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for products
alter table public.products enable row level security;
create policy "Anyone can view products." on public.products for select using (true);
create policy "Admins can manage products." on public.products for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Cashiers can update product stock." on public.products for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'kasir')
);

-- TRANSACTIONS TABLE
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  tanggal timestamp with time zone default timezone('utc'::text, now()) not null,
  total numeric not null check (total >= 0),
  metode_pembayaran text not null check (metode_pembayaran in ('cash', 'e-wallet', 'transfer')),
  kasir_id uuid references public.users(id) not null
);

alter table public.transactions enable row level security;
create policy "Anyone can insert transactions." on public.transactions for insert with check (auth.uid() is not null);
create policy "Users can view their transactions." on public.transactions for select using (auth.uid() = kasir_id);
create policy "Admins can view all transactions." on public.transactions for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- TRANSACTION ITEMS TABLE
create table public.transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaksi_id uuid references public.transactions(id) on delete cascade not null,
  produk_id uuid references public.products(id) not null,
  jumlah integer not null check (jumlah > 0),
  harga numeric not null check (harga >= 0),
  subtotal numeric not null check (subtotal >= 0)
);

alter table public.transaction_items enable row level security;
create policy "Anyone can insert transaction items." on public.transaction_items for insert with check (auth.uid() is not null);
create policy "Users can view transaction items." on public.transaction_items for select using (
  exists (select 1 from public.transactions where id = transaction_items.transaksi_id and (kasir_id = auth.uid() or exists (select 1 from public.users where id = auth.uid() and role = 'admin')))
);

-- STOCK LOGS TABLE
create table public.stock_logs (
  id uuid default uuid_generate_v4() primary key,
  produk_id uuid references public.products(id) on delete cascade not null,
  perubahan integer not null,
  alasan text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stock_logs enable row level security;
create policy "Admins can view stock logs." on public.stock_logs for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- SETTINGS TABLE
create table public.settings (
  id text primary key default 'store_info',
  nama_toko text not null default 'Baby Shop',
  alamat text,
  telepon text,
  email text,
  logo text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;
create policy "Anyone can view settings." on public.settings for select using (true);
create policy "Admins can update settings." on public.settings for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Initialize settings
insert into public.settings (id, nama_toko) values ('store_info', 'Baby Shop') on conflict (id) do nothing;

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
create policy "Public Access" on storage.objects for select using ( bucket_id = 'products' );
create policy "Admin Insert" on storage.objects for insert with check ( bucket_id = 'products' and exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Admin Delete" on storage.objects for delete using ( bucket_id = 'products' and exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- TRIGGER FOR NEW USER SYNC
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, nama, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nama', new.email), new.email, 'kasir');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
