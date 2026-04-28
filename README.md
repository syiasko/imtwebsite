# IMT Karoseri - Website Showcase

Single-page React app untuk showcase **PT. INDRAPRASTA MULIA TEKNIK** (IMT Karoseri) — produsen kendaraan khusus: mobil pemadam, ambulance, golf car, mobil rantis, food truck, dan mobil satelit.

## Fitur

### Public
- Hero section + section YouTube embed di bawah hero
- Showcase kendaraan per kategori dengan filter & search
- Detail spesifikasi kendaraan + slideshow auto-play
- Download katalog (file PDF custom yang diupload admin, atau fallback ke print)
- Halaman kontak dengan Google Maps embed + WhatsApp CTA

### Admin Panel (`/dapurnyaimt`)
- Login dengan password (hash SHA-256 disimpan di Firestore)
- **Kategori** — CRUD kategori kendaraan
- **Kendaraan** — CRUD unit kendaraan dengan upload foto, spec key/value, fitur unggulan
- **Company Setting** — edit identitas perusahaan, alamat, kontak, URL YouTube, Google Maps embed, dan upload katalog PDF
- Ganti password admin
- Reset data ke seed default

> Default password admin: `imt-admin` — **wajib diganti setelah login pertama**.

## Stack

- React 18 + Vite 5 + React Router 6
- Tailwind CSS 3 dengan palette: `primary #00428f` / `secondary #feae00` / `black & white`
- **Firebase**: Firestore (data), Anonymous Auth (untuk write rules), Analytics (page tracking + custom events)
- Vercel-ready (lihat `vercel.json` — SPA rewrites)

## Setup Firebase (sekali setup)

Project sudah hard-code ke `imtwebsite-ddf59`. Yang perlu dilakukan di Firebase Console:

1. **Authentication** → Sign-in method → **Anonymous** → Enable
2. **Firestore Database** → Create Database → Production mode
3. **Firestore Rules** → paste dari `firestore.rules`
4. **Storage** → Get started → pilih region → Production mode
5. **Storage Rules** → paste dari `storage.rules` (public read, auth write, max 1.5MB per file)
6. **Analytics** sudah otomatis aktif via `measurementId`

Saat pertama kali user membuka website, app akan auto-seed Firestore dengan data default.

> Foto kendaraan disimpan di Firebase Storage di path `vehicles/{vehicleId}/{file}`. Saat tambah/hapus foto via admin panel, file akan otomatis ter-upload/dihapus.

## Cara menjalankan

```bash
npm install
npm run dev      # localhost:5173
npm run build    # produksi ke folder dist/
npm run preview  # preview hasil build
```

## Struktur

```
src/
  firebase/
    config.js      Firebase init + analytics + ensureAnonAuth
    api.js         Firestore data access (subscribe, save, delete, seed)
    password.js    SHA-256 + verify helper
  context/
    DataContext.jsx   subscribe Firestore + state + actions
  data/
    initialData.js    seed defaults (categories, vehicles, company)
  components/
    Navbar, Footer, VehicleCard, Slideshow, SpecTable
    YouTubeSection, MapEmbed
  pages/
    Home, Products, VehicleDetail, Catalog, Contact
    Admin (route: /dapurnyaimt)
    admin/ AdminCategories, AdminVehicles, AdminSettings
  App.jsx     router + page tracking
  main.jsx    entry
```

## Analytics

- `page_view` event dipanggil di setiap perubahan route
- `whatsapp_click` di tombol WA (source: `vehicle_detail`, `contact`)
- `contact_form_submit` saat form kontak disubmit

Lihat data di **Firebase Console → Analytics** atau Google Analytics dashboard.

## Catatan

- Foto kendaraan disimpan di **Firebase Storage** (`vehicles/{id}/...`); Firestore hanya menyimpan URL-nya. Auto-compress kalau file > 1MB. Maks **10 foto per unit, 1 MB per foto** (≈10 MB per unit).
- PDF katalog max 800KB jika diupload langsung; lebih dari itu paste URL eksternal (Google Drive, Dropbox, dll).
