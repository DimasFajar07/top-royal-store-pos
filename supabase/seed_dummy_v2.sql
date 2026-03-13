-- PERBAIKAN TOTAL UNTUK MASALAH INFINITE RECURSION PADA RLS
-- Masalah ini terjadi karena kebijakan RLS mencoba men-query tabel `users` untuk mengecek role 'admin',
-- sementara query tersebut akan memicu kebijakan RLS di tabel `users` lagi (looping).
-- Solusi terbaiknya adalah dengan mengecek `auth.jwt() ->> 'role'` atau menggunakan fungsi `auth.uid()` murni.

-- Hapus Dulu Semua Policy yang Bermasalah
DROP POLICY IF EXISTS "Admins can view all profiles." ON public.users;
DROP POLICY IF EXISTS "Admins can manage categories." ON public.categories;
DROP POLICY IF EXISTS "Admins can manage products." ON public.products;
DROP POLICY IF EXISTS "Admins can view all transactions." ON public.transactions;
DROP POLICY IF EXISTS "Users can view transaction items." ON public.transaction_items;
DROP POLICY IF EXISTS "Admins can view stock logs." ON public.stock_logs;
DROP POLICY IF EXISTS "Admins can update settings." ON public.settings;

-- Buat function yang kebal dari RLS untuk mengecek role admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- FLAG SECURITY DEFINER sangat penting disini. Ini akan membypass RLS saat mengecek role.

-- Buat function yang kebal dari RLS untuk mengecek role kasir
CREATE OR REPLACE FUNCTION public.is_kasir()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'kasir'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RECREATE POLICIES MENGGUNAKAN FUNCTION SECURITY DEFINER
-- 1. Tabel Users
CREATE POLICY "Admins can view all profiles." ON public.users FOR SELECT USING ( public.is_admin() );

-- 2. Tabel Categories
CREATE POLICY "Admins can manage categories." ON public.categories FOR ALL USING ( public.is_admin() );

-- 3. Tabel Products
CREATE POLICY "Admins can manage products." ON public.products FOR ALL USING ( public.is_admin() );

-- 4. Tabel Transactions
CREATE POLICY "Admins can view all transactions." ON public.transactions FOR SELECT USING ( public.is_admin() );

-- 5. Tabel Transaction Items
CREATE POLICY "Users can view transaction items." ON public.transaction_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_items.transaksi_id AND kasir_id = auth.uid())
  OR public.is_admin()
);

-- 6. Tabel Stock Logs
CREATE POLICY "Admins can view stock logs." ON public.stock_logs FOR SELECT USING ( public.is_admin() );

-- 7. Tabel Settings
CREATE POLICY "Admins can update settings." ON public.settings FOR UPDATE USING ( public.is_admin() );


-- INSERT DATA DUMMY LAGI JIKA SEBELUMNYA GAGAL KARENA RECURSION
insert into public.categories (nama) values 
  ('Pakaian Bayi'),
  ('Perlengkapan Mandi'),
  ('Mainan'),
  ('Makanan Bayi')
on conflict (nama) do nothing;

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
    ('Sabun Cair Bayi 500ml', cat_mandi, 25000, 35000, 50, 'M001'),
    ('Handuk Bayi Serat Bambu', cat_mandi, 45000, 60000, 30, 'M002'),
    ('Kerincingan Bayi Rattle', cat_mainan, 15000, 25000, 40, 'T001'),
    ('Mainan Gigitan Teether', cat_mainan, 20000, 35000, 100, 'T002'),
    ('Bubur Bayi Rasa Pisang', cat_makanan, 15000, 20000, 60, 'F001'),
    ('Biskuit Bayi Milna', cat_makanan, 18000, 25000, 45, 'F002')
  ON CONFLICT (barcode) DO NOTHING;
END $$;
