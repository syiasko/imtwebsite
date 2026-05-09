# IMT Karoseri — Digital Signage

Aplikasi terpisah untuk **digital signage / kiosk device** PT. INDRAPRASTA MULIA TEKNIK. Membaca data yang sama dengan website utama (Firestore project `imtwebsite-ddf59`) — saat admin mengubah katalog di [imtwebsite admin panel](../README.md), perubahan langsung terlihat di signage tanpa redeploy.

## Fitur

- **Halaman daftar**: kendaraan dikelompokkan per kategori, dengan filter pill kategori. Layout besar untuk layar TV.
- **Halaman detail**: foto carousel auto-cycle, spesifikasi teknis, fitur unggulan, dan CTA kontak.
- **Auto-return ke daftar** setelah 60 detik idle di halaman detail (kiosk-friendly).
- **Splash screen** dengan logo IMT saat boot.
- **Same brand**: palette `primary #00428f` / `secondary #feae00` + logo `/logo.png` (sama dengan imtwebsite).
- Touch / click sama-sama bekerja, big tap targets, no scrollbar.

## Stack

- React 18 + Vite 5 + Tailwind CSS 3
- Firebase (Firestore + Anonymous Auth) — connect ke project yang sama dengan imtwebsite

## Cara menjalankan

```bash
cd signage
npm install
npm run dev      # localhost:5173
npm run build    # produksi → dist/
npm run preview  # preview build hasil
```

## Deploy ke Vercel

Project ini **terpisah** dari imtwebsite. Buat Vercel project baru:

1. Import repo `syiasko/imtwebsite` di Vercel
2. **Root Directory**: `signage`
3. **Production Branch**: `digitalsignage` (atau `main` setelah merge)
4. Framework: Vite (auto-detect)
5. Deploy → dapat URL terpisah, mis. `signage.imtindonesia.com` atau `imt-signage.vercel.app`

`signage/vercel.json` sudah di-include untuk SPA rewrite (refresh halaman tidak 404).

## Setup Firebase

Tidak ada setup tambahan. Project hard-code ke `imtwebsite-ddf59`. Pastikan Firestore Rules di main project mengizinkan public read pada `categories` & `vehicles` (sudah default di `firestore.rules` imtwebsite).

## Catatan

- Foto kendaraan di-load dari Firestore sebagai data URL (base64). Untuk performa optimal di signage, pastikan admin meng-upload foto via panel admin imtwebsite (auto-compress agar muat di limit dokumen Firestore).
- Idle timeout (60 detik di detail page) bisa diubah di `signage/src/App.jsx` (`DETAIL_IDLE_TIMEOUT`).
