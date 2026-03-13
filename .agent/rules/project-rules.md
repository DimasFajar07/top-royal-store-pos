---
description: Panduan Pembaruan Core dan UI Project Baby Shop POS
---

# Aturan Proyek Baby Shop POS (Core Rules)

## 1. Bahasa dan Komunikasi
- **WAJIB 100% BAHASA INDONESIA**: Seluruh dokumen, komentar kode tingkat tinggi, pesan commit, respons AI, penjelasan arsitektur, dan semua interaksi dengan pengguna harus menggunakan Bahasa Indonesia yang baku, profesional, dan mudah dipahami.
- Tidak boleh ada toleransi (0.1% pun) untuk menggunakan bahasa asing secara dominan selain pada penulisan kode sumber asli (seperti nama variabel, fungsi, atau sintaks bawaan framework).

## 2. Prinsip Pengembangan (100% Fact-Based)
- **Tanpa Asumsi**: Setiap perubahan, penambahan fitur, atau perbaikan *bug* harus didasarkan pada data faktual dari kode yang ada (`package.json`, konfigurasi Supabase, struktur `src/`). Dilarang menebak konfigurasi atau membuat dummy code yang tidak relevan.
- **Konsistensi Mutlak**: Pola penulisan kode harus 100% konsisten dengan yang sudah ada di proyek ini. Tidak melenceng atau mengubah arsitektur dasar tanpa persetujuan eksplisit.

## 3. Tech Stack dan Standar Teknologi
Berdasarkan analisis file proyek, teknologi berikut adalah standar baku yang **TIDAK BOLEH** diganti atau dicampur dengan alternatif lain:
- **Framework & Build**: React 18 + Vite + TypeScript.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) + `lucide-react` untuk ikon. Jangan gunakan CSS kustom kecuali sangat terpaksa (gunakan class Tailwind).
- **State Management**: Zustand (`src/store/`). Tidak boleh menggunakan Redux atau Context API untuk global state yang kompleks.
- **Backend & Database**: Supabase (`@supabase/supabase-js`, `src/lib/supabase.ts`). Operasi database atau autentikasi harus selalu melewati file ini.
- **PDF & Laporan**: `jspdf`, `jspdf-autotable`, `xlsx`, `react-chartjs-2`, `chart.js` untuk fitur *reporting*.

## 4. UI/UX & Estetika
- Desain harus **WOW**, modern, responsif, dan dinamis. Gunakan transisi halus (`transition-all duration-200`, animasi custom di `index.css`), *shadows* elegan, dan tipografi yang rapi.
- Dilarang membuat UI berbentuk *Minimum Viable Product (MVP)* yang polos. Setiap tampilan harus terlihat seperti produk komersial premium.
