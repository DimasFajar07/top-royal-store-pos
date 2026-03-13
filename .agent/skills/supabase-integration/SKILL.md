---
name: Integrasi Backend Supabase
description: Panduan dan keterampilan untuk melakukan operasi database, autentikasi, dan real-time menggunakan Supabase pada proyek Baby Shop POS.
---

# Skill: Integrasi Backend Supabase (100% Berbasis Fakta Proyek)

Proyek Baby Shop POS secara eksklusif menggunakan Supabase sebagai Backend-as-a-Service (BaaS). Semua instruksi di skill ini merupakan fakta dari struktur internal proyek (`src/lib/supabase.ts` dan tabel yang didefinisikan dalam `supabase/schema.sql`).

## 1. Aturan Dasar Koneksi
1. Jangan membuat koneksi *client* baru di file yang berbeda. Setiap panggilan API Supabase harus mengimpor *client* murni dari:
   ```typescript
   import { supabase } from '../lib/supabase';
   ```

2. Operasi database (CRUD) tidak boleh dilakukan langsung dari *React Components* (`src/pages/*.tsx` atau `src/components/`). Seluruh operasi harus diabstraksi di dalam *Zustand Store* yang sesuai (`src/store/*.ts`).

## 2. Struktur Tabel & Operasi (Referensi Schema)
- **Tabel `users`**: Menyimpan profil pengguna, termasuk kolom `id`, `email`, `nama`, `role`, dan `created_at`.
- **Tabel `products`**: Menyimpan daftar inventaris barang. Selalu pastikan kolom seperti `stock`, `price`, dan `sku` ditangani secara konsisten dan valid.
- **Tabel `transactions` dan `transaction_items`**: Menangani data penjualan (Point of Sale). Jangan melakukan *hard-delete* pada histori transaksi; ini adalah data *read-only* atau tipe *append-only* untuk audit kasir.

## 3. Menangani Autentikasi
Gunakan method dari `supabase.auth` dengan *error handling* ketat.
Misal: `signInWithPassword()`, `signUp()`, dan `signOut()`.

*Ingat Catatan Penting*: Karena proyek masih dalam *development*, pastikan opsi "Confirm email" di Dashboard Supabase telah dimatikan agar pengguna dapat langsung masuk setelah pendaftaran tanpa perlu verifikasi email manual.

## 4. Keamanan dan Row Level Security (RLS)
Setiap kueri *(queries)* harus mematuhi kebijakan RLS. Jangan mencoba membypass (melewati) *security* aplikasi kecuali menggunakan `service_role` secara eksplisit, yang sangat dihindari untuk proyek Client-Side.

---
**Tugas Anda Saat Menggunakan Skill Ini:**
Sebagai agen, jika Anda merancang fitur keranjang belanja, dasbor ringkasan, atau penambahan produk, selalu rujuk format penulisan TypeScript pada file `src/store/products.ts` atau `auth.ts` untuk presisi 100% dalam implementasi *fetch*, *insert*, dan *update*.
