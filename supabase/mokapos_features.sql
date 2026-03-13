-- =================================================================
-- BABY SHOP POS — FULL DATABASE SETUP (Jalankan di Supabase SQL Editor)
-- Includes: Customers, Member, Shifts, Settings, Stock, Reports
-- =================================================================

-- ---------------------------------------------------------------
-- 1. FUNGSI KEAMANAN (Security Definer) — Untuk RLS Policy
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------
-- 2. TABEL KATEGORI PRODUK
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Semua user autentikasi bisa baca kategori" ON public.categories;
CREATE POLICY "Semua user autentikasi bisa baca kategori" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin bisa kelola kategori" ON public.categories;
CREATE POLICY "Admin bisa kelola kategori" ON public.categories
  FOR ALL USING (public.is_admin());

-- ---------------------------------------------------------------
-- 3. TABEL PRODUK
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_produk VARCHAR(200) NOT NULL,
  kategori_id UUID REFERENCES public.categories(id),
  kategori VARCHAR(100),
  harga BIGINT NOT NULL DEFAULT 0,
  stok INTEGER NOT NULL DEFAULT 0,
  barcode VARCHAR(100),
  gambar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Semua user autentikasi bisa baca produk" ON public.products;
CREATE POLICY "Semua user autentikasi bisa baca produk" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin bisa kelola produk" ON public.products;
CREATE POLICY "Admin bisa kelola produk" ON public.products
  FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Kasir bisa update stok" ON public.products;
CREATE POLICY "Kasir bisa update stok" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- 4. TABEL PELANGGAN & MEMBER
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  nomor_hp VARCHAR(20),
  email VARCHAR(100),
  poin INTEGER DEFAULT 0,
  total_transaksi INTEGER DEFAULT 0,   -- Counter otomatis naik per transaksi
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Authenticated users can manage customers" ON public.customers
  FOR ALL USING (auth.role() = 'authenticated');

-- Tampilkan level member di query:
-- Bronze: total_transaksi >= 3
-- Silver: total_transaksi >= 10
-- Gold : total_transaksi >= 20

-- ---------------------------------------------------------------
-- 5. TABEL SHIFT KASIR
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kasir_id UUID REFERENCES public.users(id),
  waktu_mulai TIMESTAMPTZ DEFAULT NOW(),
  waktu_selesai TIMESTAMPTZ,
  kas_awal BIGINT DEFAULT 0,
  total_tunai BIGINT DEFAULT 0,
  total_non_tunai BIGINT DEFAULT 0,
  total_transaksi INTEGER DEFAULT 0,
  catatan TEXT,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kasir bisa kelola shift sendiri" ON public.shifts;
CREATE POLICY "Kasir bisa kelola shift sendiri" ON public.shifts
  FOR ALL USING (kasir_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------
-- 6. TABEL TRANSAKSI (dengan kolom baru)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  total BIGINT NOT NULL,
  metode_pembayaran VARCHAR(50) NOT NULL DEFAULT 'cash',
  kasir_id UUID REFERENCES public.users(id),
  diskon BIGINT DEFAULT 0,
  catatan TEXT,
  customer_id UUID REFERENCES public.customers(id),
  shift_id UUID REFERENCES public.shifts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kasir bisa insert transaksi" ON public.transactions;
CREATE POLICY "Kasir bisa insert transaksi" ON public.transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "User autentikasi bisa baca transaksi" ON public.transactions;
CREATE POLICY "User autentikasi bisa baca transaksi" ON public.transactions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Tambah kolom jika tabel sudah ada sebelumnya (safe)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS diskon BIGINT DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.shifts(id);

-- ---------------------------------------------------------------
-- 7. TABEL ITEM TRANSAKSI
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaksi_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  produk_id UUID REFERENCES public.products(id),
  jumlah INTEGER NOT NULL DEFAULT 1,
  harga BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kasir bisa insert item transaksi" ON public.transaction_items;
CREATE POLICY "Kasir bisa insert item transaksi" ON public.transaction_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "User autentikasi bisa baca item transaksi" ON public.transaction_items;
CREATE POLICY "User autentikasi bisa baca item transaksi" ON public.transaction_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- 8. TABEL STOK LOG (Riwayat Perubahan Stok)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produk_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  perubahan INTEGER NOT NULL,   -- positif = tambah, negatif = kurang
  alasan TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated bisa kelola stock_logs" ON public.stock_logs;
CREATE POLICY "Authenticated bisa kelola stock_logs" ON public.stock_logs
  FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.stock_logs ADD COLUMN IF NOT EXISTS alasan TEXT;

-- ---------------------------------------------------------------
-- 9. TABEL SETTINGS TOKO
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_toko VARCHAR(100) DEFAULT 'Top Royal Shop',
  alamat TEXT DEFAULT '',
  nomor_hp VARCHAR(20) DEFAULT '',
  catatan_struk TEXT DEFAULT 'Terima kasih telah berbelanja!',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Semua bisa baca settings" ON public.settings;
CREATE POLICY "Semua bisa baca settings" ON public.settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin bisa update settings" ON public.settings;
CREATE POLICY "Admin bisa update settings" ON public.settings FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Admin bisa insert settings" ON public.settings;
CREATE POLICY "Admin bisa insert settings" ON public.settings FOR INSERT WITH CHECK (public.is_admin());

-- Tambah kolom jika settings sudah ada dari SQL sebelumnya (safe ALTER)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS nomor_hp VARCHAR(20) DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS catatan_struk TEXT DEFAULT 'Terima kasih telah berbelanja!';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS alamat TEXT DEFAULT '';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Insert default settings jika belum ada
INSERT INTO public.settings (nama_toko, alamat, nomor_hp, catatan_struk)
SELECT 'Top Royal Shop', 'Jl. Contoh No. 123, Kota', '0812-3456-7890', 'Terima kasih telah berbelanja! Barang yang sudah dibeli tidak dapat dikembalikan.'
WHERE NOT EXISTS (SELECT 1 FROM public.settings LIMIT 1);


-- =================================================================
-- SELESAI! Semua tabel berhasil dibuat.
-- Fitur yang tersedia setelah script ini:
-- ✅ Laporan Harian, Mingguan, Bulanan (halaman /reports)
-- ✅ Stok Barang & Riwayat Stok (halaman /stock)
-- ✅ Pelanggan & Member Bronze/Silver/Gold (halaman /customers)
-- ✅ Bayar Sekarang + Metode Pembayaran (halaman /pos)
-- ✅ Shift Kasir (halaman /shift)
-- ✅ Settings Toko (halaman /settings)
-- =================================================================
