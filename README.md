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
- Login username + password lewat Supabase Auth; role **admin** dan **editor**
  disimpan di tabel `profiles` dan diperiksa oleh row level security (RLS)
- **Kategori** — CRUD kategori kendaraan
- **Kendaraan** — CRUD unit dengan upload foto (ke R2), spec key/value, fitur unggulan
- **Company Setting** — identitas perusahaan, kontak, YouTube, Google Maps, katalog PDF (ke R2)
- **Greeting** — teks sambutan TV signage
- **Pengguna** (admin) — tambah user, ubah nama/role, atur ulang password, hapus
- **Akses AI** — token untuk AI agent (lihat di bawah)
- **Ganti password** — setiap user mengganti password-nya sendiri

### Kelola lewat AI agent (MCP)
Fitur panel admin juga tersedia sebagai tools MCP, supaya admin bisa mengubah
konten lewat chat di Claude Code, Codex, atau agent lain. Tab **Akses AI** di
panel membuat token untuk endpoint `/api/mcp` dan menampilkan sesi agent yang
aktif. Token bertindak sebagai akun pembuatnya, dengan role-nya. Lihat
[`mcp/README.md`](mcp/README.md).

## Stack

- React 18 + Vite 5 + React Router 6, Tailwind CSS 3
  (palette `primary #00428f` / `secondary #feae00`)
- **Supabase** (Postgres + Auth): katalog, pengaturan, pesan kontak, akun, token AI.
  Skema dan RLS di `supabase/migrations/`
- **Cloudflare R2**: foto unit (ukuran penuh 1600 px dan kecil 640 px) dan
  katalog PDF, dilayani lewat CDN di `https://artu.imtindonesia.com`
- **Firebase**: hanya greeting signage (`settings/greeting` di Firestore, dibaca
  aplikasi TV) dan Analytics
- **Vercel**: hosting + fungsi `api/` (upload media, akun, greeting, MCP)

## Arsitektur data

- Halaman publik membaca `categories`, `vehicles`, `settings` dari Supabase
  sekali saat dibuka (sekitar 70 KB), lalu foto dimuat dari CDN sesuai
  kebutuhan (thumbnail di kartu, ukuran penuh di halaman detail).
- `vehicles.images` menyimpan key R2 (`vehicles/<id>/<uuid>.jpg`; versi kecil
  `...-sm.jpg`) atau URL https untuk gambar eksternal. `src/lib/media.js`
  mengubah key jadi URL.
- Upload dari panel: browser mengompres foto, minta presigned URL ke
  `api/media.js`, lalu mengunggah langsung ke R2.
- Panel memakai Supabase Realtime, jadi perubahan dari admin lain atau AI
  agent langsung terlihat.

## Setup (sekali)

1. **Supabase**: terapkan skema dengan
   `npx supabase db push --db-url "$SUPABASE_DB_URL"`. Di dashboard
   Authentication, matikan **Allow new users to sign up**; akun dibuat dari
   panel (Pengguna) lewat `api/admin-users.js`.
2. **R2**: bucket `imt-website-media`; hubungkan custom domain
   `artu.imtindonesia.com` (R2, bucket, Settings, Custom Domains). Jangan
   pakai URL `r2.dev`: sebagian ISP di Indonesia memblokirnya.
3. **Vercel env**: isi semua variabel server di `.env.example`
   (`SUPABASE_SECRET_KEY`, `R2_*`, `MEDIA_BASE_URL`, `FIREBASE_SERVICE_ACCOUNT`).
   Variabel `VITE_*` publik sudah ada di `.env.production`.
4. **Firestore rules**: `firebase deploy --only firestore:rules` (hanya greeting
   yang bisa dibaca; semua tulis lewat server).

Username login dipetakan ke email `<username>@staff.imt-karoseri.invalid`.
Domain `.invalid` tidak bisa menerima email, jadi tidak ada email yang terkirim.

Migrasi dari Firestore (sudah dijalankan sekali, aman diulang):
`node --env-file=.env.local scripts/migrate-firestore-to-supabase.mjs`
(opsinya dijelaskan di komentar awal file).

## Cara menjalankan

```bash
npm install
npm run dev      # localhost:5173
npm run build    # produksi ke folder dist/
npm run preview  # preview hasil build
```

## Struktur

```
api/                 fungsi Vercel: media.js, admin-users.js, greeting.js, mcp.js
server/              helper server: Supabase service client, R2, greeting, akun
mcp/tools.mjs        tools MCP (dipakai api/mcp.js)
scripts/             migrasi Firestore -> Supabase + R2
supabase/migrations/ skema + RLS
src/
  lib/               supabase.js (client), api.js (akses data), media.js, staff.js
  firebase/config.js greeting (Firestore) + Analytics
  context/           AuthContext (Supabase Auth), DataContext (data + aksi)
  pages/             halaman publik + admin/ (panel)
```
