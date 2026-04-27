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

1. **Firestore Database** → Create Database → Production mode (atau test mode untuk dev cepat)
2. **Authentication** → Sign-in method → **Anonymous** → Enable
3. **Firestore Rules** → paste dari `firestore.rules` atau:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{collection}/{id} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

4. **Analytics** sudah otomatis aktif via `measurementId` di config

Saat pertama kali user membuka website, app akan auto-seed Firestore dengan data default (6 kategori + contoh unit + company settings).

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

- Foto kendaraan disimpan sebagai data URL di Firestore (max ~700KB per foto). Untuk gambar lebih besar atau koleksi banyak, sebaiknya migrate ke Firebase Storage.
- PDF katalog max 800KB jika diupload langsung; lebih dari itu paste URL eksternal (Google Drive, Dropbox, dll).
