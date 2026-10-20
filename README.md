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
- Login username + password lewat Firebase Authentication (email/password)
- Role **admin** dan **editor** disimpan di `users/{uid}`; Firestore rules memeriksa role di server
- **Kategori** — CRUD kategori kendaraan
- **Kendaraan** — CRUD unit kendaraan dengan upload foto, spec key/value, fitur unggulan
- **Company Setting** — edit identitas perusahaan, alamat, kontak, URL YouTube, Google Maps embed, dan upload katalog PDF
- **Pengguna** (admin) — tambah user baru, ubah nama/role, cabut akses
- **Ganti password** — setiap user mengganti password-nya sendiri

> Password user lain tidak bisa diganti dari panel. Kalau ada yang lupa
> password, reset di Firebase Console → Authentication → Users.

### Kelola lewat AI agent (MCP)
`mcp/server.mjs` membuka fitur panel admin sebagai tools MCP, supaya admin bisa
mengubah konten lewat chat di Claude Code atau Codex. Login memakai akun panel
yang sama, dan role-nya tetap berlaku. Lihat [`mcp/README.md`](mcp/README.md).

## Stack

- React 18 + Vite 5 + React Router 6
- Tailwind CSS 3 dengan palette: `primary #00428f` / `secondary #feae00` / `black & white`
- **Firebase**: Firestore (data), Authentication email/password (login admin), Analytics (page tracking + custom events)
- Vercel-ready (lihat `vercel.json` — SPA rewrites)

## Setup Firebase (sekali setup)

Project sudah hard-code ke `imtwebsite-ddf59`. Yang perlu dilakukan di Firebase Console:

1. **Authentication** → Sign-in method → **Email/Password** → Enable
   (atau `firebase deploy --only auth`, konfigurasinya ada di `firebase.json`)
2. **Firestore Rules** → `firebase deploy --only firestore:rules`
3. **Analytics** sudah otomatis aktif via `measurementId`

Username login dipetakan ke email `<username>@imtwebsite-ddf59.firebaseapp.com`
di Firebase Auth. Tidak ada email yang dikirim ke alamat itu.

### Tes lokal dengan emulator

```bash
firebase emulators:start               # auth :9099, firestore :8080 (butuh Java)
VITE_FIREBASE_EMULATORS=1 npm run dev  # app memakai emulator, bukan produksi
```

> Foto kendaraan disimpan sebagai data URL (base64) di **Firestore** — gratis dalam free tier sampai 1 GB. Untuk muat 10 foto dalam 1 dokumen Firestore (limit 1 MB/dok), tiap foto otomatis dikompres ke ≤90 KB base64. Tidak perlu Firebase Storage (yang berbayar).

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
    config.js      Firebase init + analytics + emulator switch
    api.js         Firestore data access (subscribe, save, delete) + pembuatan akun staf
  context/
    AuthContext.jsx   login Firebase Auth + profil/role user
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

- Foto kendaraan disimpan sebagai data URL (base64) di Firestore. Maks **10 foto per unit**, target ≤90 KB base64 per foto (auto-compress agresif via canvas) supaya muat di 1 dokumen Firestore (limit 1 MB/dok). Resolusi tampilan masih cukup untuk listing & detail dengan slideshow (~1280px lebar).
- PDF katalog max 800KB jika diupload langsung; lebih dari itu paste URL eksternal (Google Drive, Dropbox, dll).
