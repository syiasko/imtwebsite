# imt-admin MCP server

Mengelola konten website IMT dari chat AI agent (Claude Code, Codex, Cursor,
atau klien MCP lain), tanpa membuka panel `/dapurnyaimt`. Contoh permintaan:

- "Tambah unit Tangki 8 KL di kategori Truk Tangki, foto ada di ~/Desktop/tangki"
- "Ganti nomor WhatsApp jadi 0812..."
- "Aktifkan greeting untuk Ibu Sari, Direktur PT Maju"
- "Ada pesan kontak baru? Tandai yang dari Budi sudah dibalas"

Ada dua cara menghubungkan agent. Tools-nya sama (`mcp/tools.mjs`):

| | Hosted (disarankan) | Lokal (stdio) |
| --- | --- | --- |
| Endpoint | `https://<domain>/api/mcp` (`api/mcp.js`, Vercel) | `node mcp/server.mjs` |
| Login | Token dari menu **Akses AI** di panel | Username + password panel di env |
| Butuh repo di komputer | Tidak | Ya |
| Foto dari file lokal | Agent mengirim isi file (base64) atau URL | Path file langsung |

Kedua cara bertindak sebagai akun panel pemiliknya, dengan role akun itu:

| Role   | Bisa                                                                    |
| ------ | ----------------------------------------------------------------------- |
| editor | kategori, unit kendaraan dan fotonya, membaca pesan dan mengubah status |
| admin  | semua yang di atas, ditambah Company Setting, katalog PDF, greeting, hapus pesan, kelola pengguna |

Perubahan langsung tayang di website. Klien MCP meminta persetujuan sebelum
setiap aksi, jadi baca dulu apa yang akan dijalankan sebelum menyetujuinya.

## Tools

| Bagian      | Tools |
| ----------- | ----- |
| Akun        | `whoami` |
| Kategori    | `list_categories`, `save_category`, `delete_category` (ikut menghapus unit di dalamnya) |
| Unit        | `list_vehicles`, `get_vehicle`, `save_vehicle`, `add_vehicle_photos`, `arrange_vehicle_photos`, `delete_vehicle` |
| Perusahaan  | `get_company_settings`, `update_company_settings`, `set_catalog_pdf` |
| Greeting    | `get_greeting`, `update_greeting` |
| Pesan       | `list_messages`, `get_message`, `set_message_status`, `delete_message` |
| Pengguna    | `list_users`, `create_user`, `update_user`, `remove_user` |

Foto dikompres seperti di panel (JPEG, sisi terpanjang 1280 px, sekitar
90 KB), maksimal 10 foto per unit. Foto pertama jadi cover.

## Hosted: token dari menu Akses AI

1. Login ke panel, buka tab **Akses AI**, buat token (beri nama sesuai
   perangkat/agent, pilih masa berlaku). Token hanya tampil sekali.
2. Pasang di agent. Perintah lengkap dengan URL domain ada di halaman itu:
   - Claude Code:
     `claude mcp add --transport http imt-admin https://<domain>/api/mcp --header "Authorization: Bearer <TOKEN>"`
   - Codex (`~/.codex/config.toml`), token di env `IMT_MCP_TOKEN`:
     ```toml
     [mcp_servers.imt-admin]
     url = "https://<domain>/api/mcp"
     bearer_token_env_var = "IMT_MCP_TOKEN"
     ```
3. Tabel di Akses AI menampilkan agent terakhir yang memakai token, kapan
   terakhir dipakai, dan tanda **Aktif** bila dipakai dalam 10 menit
   terakhir. Admin melihat token semua pengguna. **Cabut** menghentikan
   akses pada permintaan berikutnya. Token juga berhenti bekerja bila
   pemiliknya dihapus dari Pengguna, dan role-nya mengikuti role terbaru.

Firestore hanya menyimpan hash SHA-256 dari token (`ai_tokens/{id}`).

**Setup server (sekali):** endpoint memakai Firebase Admin SDK, jadi Vercel
butuh env var `FIREBASE_SERVICE_ACCOUNT` berisi JSON service account
(Firebase Console, Project settings, Service accounts, Generate new private
key). Opsional: `IMT_SITE_URL` untuk link di jawaban agent (default: domain
request). Karena Admin SDK melewati Firestore rules, pembatasan role di
endpoint ini dijalankan oleh `mcp/tools.mjs`.

## Lokal: stdio

Butuh Node 20+ dan `npm install` di root repo. Simpan kredensial di
environment, misalnya di `~/.zshrc`:

```bash
export IMT_ADMIN_USERNAME="username-panel-anda"
export IMT_ADMIN_PASSWORD="password-panel-anda"
export IMT_SITE_URL="https://domain-website"   # opsional
```

- Claude Code: sudah terdaftar di `.mcp.json` sebagai `imt-admin`. Buka
  `claude` di folder repo, setujui server `imt-admin`, cek dengan `/mcp`.
- Codex (`~/.codex/config.toml`, ganti path sesuai lokasi repo):
  ```toml
  [mcp_servers.imt-admin]
  command = "node"
  args = ["/path/ke/imtwebsite/mcp/server.mjs"]
  env_vars = ["IMT_ADMIN_USERNAME", "IMT_ADMIN_PASSWORD", "IMT_SITE_URL"]
  startup_timeout_sec = 30
  ```

## Tes lokal dengan emulator

```bash
firebase emulators:start
# stdio
VITE_FIREBASE_EMULATORS=1 IMT_ADMIN_USERNAME=... IMT_ADMIN_PASSWORD=... npm run mcp
# endpoint hosted (api/mcp.js) memakai emulator bila env ini di-set
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```
