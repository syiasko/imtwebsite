# imt-admin MCP server

Mengelola konten website IMT dari chat AI agent (Claude Code, Codex, atau
klien MCP lain), tanpa membuka panel `/dapurnyaimt`. Contoh permintaan:

- "Tambah unit Tangki 8 KL di kategori Truk Tangki, foto ada di ~/Desktop/tangki"
- "Ganti nomor WhatsApp jadi 0812..."
- "Aktifkan greeting untuk Ibu Sari, Direktur PT Maju"
- "Ada pesan kontak baru? Tandai yang dari Budi sudah dibalas"

Server login dengan akun panel biasa (username + password Firebase Auth).
Firestore rules dan role tetap berlaku sama seperti di panel:

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

Foto dari file lokal dikompres seperti di panel (JPEG, sisi terpanjang
1280 px, sekitar 90 KB), maksimal 10 foto per unit. Foto pertama jadi cover.

## Pasang

Butuh Node 20+ dan `npm install` di root repo.

Simpan kredensial di environment, jangan di file yang di-commit. Misalnya di
`~/.zshrc`:

```bash
export IMT_ADMIN_USERNAME="username-panel-anda"
export IMT_ADMIN_PASSWORD="password-panel-anda"
export IMT_SITE_URL="https://domain-website"   # opsional, untuk link di jawaban
```

Pakai akun milik sendiri, supaya jelas siapa yang mengubah apa. Untuk orang
yang hanya mengurus produk, buat akun role editor.

### Claude Code

Server sudah terdaftar di `.mcp.json` sebagai `imt-admin`. Buka `claude` di
folder repo ini, setujui server `imt-admin` saat ditanya, lalu cek dengan
`/mcp`.

### Codex

Tambahkan ke `~/.codex/config.toml` (ganti path sesuai lokasi repo):

```toml
[mcp_servers.imt-admin]
command = "node"
args = ["/path/ke/imtwebsite/mcp/server.mjs"]
env_vars = ["IMT_ADMIN_USERNAME", "IMT_ADMIN_PASSWORD", "IMT_SITE_URL"]
startup_timeout_sec = 30
```

Cek dengan `codex mcp get imt-admin`.

## Tes lokal

```bash
firebase emulators:start
VITE_FIREBASE_EMULATORS=1 IMT_ADMIN_USERNAME=... IMT_ADMIN_PASSWORD=... npm run mcp
```

Dengan `VITE_FIREBASE_EMULATORS=1` server memakai emulator auth (:9099) dan
Firestore (:8080), bukan data produksi.
