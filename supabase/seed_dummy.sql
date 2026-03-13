-- Drop conflicting policies on users
drop policy if exists "Users can view their own profile." on public.users;
drop policy if exists "Admins can view all profiles." on public.users;

-- Recreate policies without infinite recursion
create policy "Users can view their own profile." on public.users for select using (auth.uid() = id);
create policy "Admins can view all profiles." on public.users for select using (
  (select role from public.users where id = auth.uid()) = 'admin'
);

-- Insert Dummy Categories
insert into public.categories (nama) values 
  ('Pakaian Bayi'),
  ('Perlengkapan Mandi'),
  ('Mainan'),
  ('Makanan Bayi')
on conflict (nama) do nothing;

-- Insert Dummy Products
DO $$ 
DECLARE
  cat_pakaian uuid;
  cat_mandi uuid;
  cat_mainan uuid;
  cat_makanan uuid;
BEGIN
  SELECT id INTO cat_pakaian FROM public.categories WHERE nama = 'Pakaian Bayi';
  SELECT id INTO cat_mandi FROM public.categories WHERE nama = 'Perlengkapan Mandi';
  SELECT id INTO cat_mainan FROM public.categories WHERE nama = 'Mainan';
  SELECT id INTO cat_makanan FROM public.categories WHERE nama = 'Makanan Bayi';

  INSERT INTO public.products (nama_produk, kategori_id, harga_beli, harga_jual, stok, barcode) VALUES
    ('Baju Kodok Bayi Laki-laki', cat_pakaian, 35000, 50000, 24, 'B001'),
    ('Setelan Piyama Bayi Newborn', cat_pakaian, 40000, 65000, 15, 'B002'),
    ('Pusat Sabun Cair Bayi 500ml', cat_mandi, 25000, 35000, 50, 'M001'),
    ('Handuk Bayi Serat Bambu', cat_mandi, 45000, 60000, 30, 'M002'),
    ('Kerincingan Bayi Rattle', cat_mainan, 15000, 25000, 40, 'T001'),
    ('Mainan Gigitan Teether', cat_mainan, 20000, 35000, 100, 'T002'),
    ('Bubur Bayi Rasa Pisang', cat_makanan, 15000, 20000, 60, 'F001'),
    ('Biskuit Bayi Milna', cat_makanan, 18000, 25000, 45, 'F002')
  ON CONFLICT (barcode) DO NOTHING;
END $$;
