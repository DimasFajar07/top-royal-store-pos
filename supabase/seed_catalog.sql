-- =================================================================
-- BABY SHOP POS — DATABASE SEEDER (PRODUK & KATEGORI LENGKAP)
-- =================================================================

-- 1. Insert Kategori (Aman dari duplicate nama karena ON CONFLICT)
INSERT INTO public.categories (nama)
VALUES
  ('Pakaian Bayi'),
  ('Peralatan Makan'),
  ('Perawatan & Mandi'),
  ('Mainan & Edukasi'),
  ('Perlengkapan Tidur'),
  ('Kereta & Gendongan'),
  ('Susu & Makanan')
ON CONFLICT ON CONSTRAINT categories_nama_key DO NOTHING;

-- Opsional: Jika Anda tidak punya constraint bernama categories_nama_key,
-- Tetapi hanya nama yang unik, blok ini bisa menyesuaikan. 
-- Supabase biasanya otomatis memberi nama tabel_kolom_key.

-- 2. Insert Produk Lengkap (Hanya jika barcode belum ada)
-- Menyesuaikan nama kolom sesuai schema.sql (harga_jual dan harga_beli)
INSERT INTO public.products (nama_produk, kategori_id, harga_jual, harga_beli, stok, barcode)
SELECT * FROM (
  -- Pakaian Bayi
  SELECT 'Baju Jumper Bayi Katun Lengan Pendek', id, 35000::numeric, 25000::numeric, 50, 'PKN-001' FROM public.categories WHERE nama = 'Pakaian Bayi' UNION ALL
  SELECT 'Setelan Piyama Bayi Newborn', id, 65000::numeric, 45000::numeric, 30, 'PKN-002' FROM public.categories WHERE nama = 'Pakaian Bayi' UNION ALL
  SELECT 'Kaos Kaki Bayi Anti Selip (3 Pasang)', id, 25000::numeric, 15000::numeric, 100, 'PKN-003' FROM public.categories WHERE nama = 'Pakaian Bayi' UNION ALL
  SELECT 'Topi Rajut Bayi Karakter Beruang', id, 30000::numeric, 20000::numeric, 40, 'PKN-004' FROM public.categories WHERE nama = 'Pakaian Bayi' UNION ALL
  SELECT 'Baju Kodok Bayi Laki-laki Denim', id, 85000::numeric, 60000::numeric, 20, 'PKN-005' FROM public.categories WHERE nama = 'Pakaian Bayi' UNION ALL

  -- Peralatan Makan
  SELECT 'Botol Susu Anti Kolik 150ml', id, 45000::numeric, 30000::numeric, 60, 'PMK-001' FROM public.categories WHERE nama = 'Peralatan Makan' UNION ALL
  SELECT 'Set Piring Silikon Suction + Sendok', id, 75000::numeric, 50000::numeric, 35, 'PMK-002' FROM public.categories WHERE nama = 'Peralatan Makan' UNION ALL
  SELECT 'Slaber Bayi Silikon Anti Tumpah', id, 35000::numeric, 22000::numeric, 80, 'PMK-003' FROM public.categories WHERE nama = 'Peralatan Makan' UNION ALL
  SELECT 'Sikat Botol Susu Spons & Dot Lengkap', id, 25000::numeric, 15000::numeric, 45, 'PMK-004' FROM public.categories WHERE nama = 'Peralatan Makan' UNION ALL
  SELECT 'Empeng Bayi Ortodontik Silikon', id, 30000::numeric, 18000::numeric, 50, 'PMK-005' FROM public.categories WHERE nama = 'Peralatan Makan' UNION ALL

  -- Perawatan & Mandi
  SELECT 'Sabun & Body Wash Bayi 2-in-1 500ml', id, 55000::numeric, 35000::numeric, 30, 'PRW-001' FROM public.categories WHERE nama = 'Perawatan & Mandi' UNION ALL
  SELECT 'Handuk Mandi Microfiber Lembut Bayi', id, 60000::numeric, 40000::numeric, 40, 'PRW-002' FROM public.categories WHERE nama = 'Perawatan & Mandi' UNION ALL
  SELECT 'Minyak Telon Plus Anti Nyamuk 150ml', id, 42000::numeric, 28000::numeric, 55, 'PRW-003' FROM public.categories WHERE nama = 'Perawatan & Mandi' UNION ALL
  SELECT 'Baby Cream Ruam Popok Hypoallergenic', id, 38000::numeric, 25000::numeric, 25, 'PRW-004' FROM public.categories WHERE nama = 'Perawatan & Mandi' UNION ALL
  SELECT 'Gunting Kuku Bayi Aman Tumpul', id, 18000::numeric, 10000::numeric, 60, 'PRW-005' FROM public.categories WHERE nama = 'Perawatan & Mandi' UNION ALL

  -- Mainan & Edukasi
  SELECT 'Teether Gigitan Bayi Buah Silikon', id, 20000::numeric, 12000::numeric, 70, 'MED-001' FROM public.categories WHERE nama = 'Mainan & Edukasi' UNION ALL
  SELECT 'Soft Book Kain Interaktif Bunyi', id, 45000::numeric, 28000::numeric, 30, 'MED-002' FROM public.categories WHERE nama = 'Mainan & Edukasi' UNION ALL
  SELECT 'Mainan Kerincing Rattle Stick Hewan', id, 25000::numeric, 15000::numeric, 45, 'MED-003' FROM public.categories WHERE nama = 'Mainan & Edukasi' UNION ALL
  SELECT 'Block Balok Bangun Susun Edukasi', id, 120000::numeric, 80000::numeric, 15, 'MED-004' FROM public.categories WHERE nama = 'Mainan & Edukasi' UNION ALL
  SELECT 'Playmat Matras Main Bayi Gulung', id, 185000::numeric, 130000::numeric, 10, 'MED-005' FROM public.categories WHERE nama = 'Mainan & Edukasi' UNION ALL

  -- Perlengkapan Tidur
  SELECT 'Selimut Bayi Bulu Karakter', id, 75000::numeric, 50000::numeric, 25, 'PTD-001' FROM public.categories WHERE nama = 'Perlengkapan Tidur' UNION ALL
  SELECT 'Bantal Peyang Mahkota Nyaman', id, 40000::numeric, 25000::numeric, 40, 'PTD-002' FROM public.categories WHERE nama = 'Perlengkapan Tidur' UNION ALL
  SELECT 'Perlak Tahan Air Motif Lucu', id, 35000::numeric, 22000::numeric, 60, 'PTD-003' FROM public.categories WHERE nama = 'Perlengkapan Tidur' UNION ALL

  -- Kereta & Gendongan
  SELECT 'Gendongan Kaos (Geos) Kain Premium', id, 95000::numeric, 65000::numeric, 20, 'KGN-001' FROM public.categories WHERE nama = 'Kereta & Gendongan' UNION ALL
  SELECT 'Hipseat Baby Carrier', id, 225000::numeric, 160000::numeric, 8, 'KGN-002' FROM public.categories WHERE nama = 'Kereta & Gendongan' UNION ALL

  -- Susu & Makanan
  SELECT 'Susu Formula Bayi 0-6 Bulan 400gr', id, 135000::numeric, 115000::numeric, 50, 'SMK-001' FROM public.categories WHERE nama = 'Susu & Makanan' UNION ALL
  SELECT 'Biskuit Bayi Rasa Susu & Madu', id, 25000::numeric, 18000::numeric, 45, 'SMK-002' FROM public.categories WHERE nama = 'Susu & Makanan' UNION ALL
  SELECT 'Bubur Bayi Organik Beras Merah', id, 18000::numeric, 12000::numeric, 60, 'SMK-003' FROM public.categories WHERE nama = 'Susu & Makanan'
) AS t(nama_produk, kategori_id, harga_jual, harga_beli, stok, barcode)
WHERE NOT EXISTS (
  SELECT 1 FROM public.products p WHERE p.barcode = t.barcode
);
