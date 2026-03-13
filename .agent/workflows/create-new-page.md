---
description: Alur kerja untuk membuat fitur atau halaman baru di Baby Shop POS
---

# Alur Kerja: Pembuatan Halaman/Fitur Baru

Workflow ini harus dijalankan setiap kali ada permintaan untuk membuat menu atau halaman baru di dalam aplikasi Point of Sale (POS) ini.

## Langkah 1: Perencanaan State Management (Zustand)
Jika halaman membutuhkan state global (seperti keranjang belanja, data kasir, list produk), buat atau perbarui store di `src/store/`.
- Gunakan TypeScript Interface untuk mendefinisikan tipe data state.
- Hubungkan dengan Supabase jika memerlukan *fetch* data dari backend.

## Langkah 2: Pembuatan Komponen UI (React + Tailwind)
1. Buat file baru di `src/pages/[NamaHalaman].tsx`.
2. Gunakan komponen fungsional React (Functional Component).
3. Pastikan mengimpor ikon dari `lucide-react` jika dibutuhkan.
4. Tulis antarmuka dengan Tailwind CSS v4 sesuai standar *rules* (modern, ada *shadow*, transisi, *glassmorphism* jika cocok).
5. Semua interaksi data UI dengan backend **wajib** melalui layer `supabase` atau Zustand, bukan *fetch* langsung ke API sembarangan.

## Langkah 3: Registrasi Rute (React Router)
- Buka `src/App.tsx`.
- Daftarkan komponen halaman yang baru dibuat di dalam rute (`<Route />`) yang didefinisikan oleh `react-router-dom`.
- Pastikan menerapkan *ProtectedRoute* (jika rute tersebut mewajibkan pengguna login).

## Langkah 4: Verifikasi & Testing
Pastikan untuk menjalankan proyek (`npm run dev`) dan memverifikasi apakah rute dapat diakses, UI sesuai standar, dan komunikasi data berjalan lancar tanpa *error* di konsol.
