# IMT Karoseri - Website Showcase

Single-page React app untuk showcase karoseri kendaraan khusus: **mobil pemadam, ambulance, golf car, mobil rantis, food truck, dan mobil satelit**.

## Fitur

### Public
- **Showcase kendaraan** per kategori dengan filter & search
- **Detail spesifikasi kendaraan** lengkap (chassis, dimensi, fitur)
- **Slideshow kendaraan** otomatis dengan thumbnail navigation
- **Download katalog** (PDF via cetak browser & JSON export)
- Halaman kontak dengan form & integrasi WhatsApp

### Admin Panel (`/admin`)
- Login sederhana (password demo: `imt-admin`)
- **Tambah & ubah kategori kendaraan** (CRUD)
- **Tambah & ubah kendaraan** (CRUD) — termasuk upload foto, edit spesifikasi, dan fitur unggulan
- Reset data ke kondisi awal
- Statistik jumlah unit per kategori

## Teknologi

- React 18 + Vite 5
- React Router v6
- Tailwind CSS 3
- localStorage untuk persistensi data (tanpa backend)

## Cara Menjalankan

```bash
npm install
npm run dev      # development di http://localhost:5173
npm run build    # produksi ke folder dist/
npm run preview  # preview hasil build
```

## Struktur

```
src/
  components/   # Navbar, Footer, VehicleCard, Slideshow, SpecTable
  context/      # DataContext (state + localStorage)
  data/         # Seed data (kategori, kendaraan, info perusahaan)
  pages/        # Home, Products, VehicleDetail, Catalog, Contact, Admin
    admin/      # AdminCategories, AdminVehicles
  App.jsx       # Router
  main.jsx      # Entry point
```

## Catatan

- Data tersimpan di `localStorage` browser. Foto disimpan sebagai data URL (max 1.5 MB per foto agar tidak melewati quota).
- Untuk produksi nyata, ganti localStorage dengan backend (REST API / Firebase / Supabase) dan upload foto ke object storage.
