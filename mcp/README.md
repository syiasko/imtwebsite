# imt-admin MCP server

Mengelola konten website IMT dari chat AI agent (Claude Code, Codex, Cursor,
atau klien MCP lain), tanpa membuka panel `/dapurnyaimt`. Contoh permintaan:

- "Tambah unit Tangki 8 KL di kategori Truk Tangki, foto ada di ~/Desktop/tangki"
- "Ganti nomor WhatsApp jadi 0812..."
- "Aktifkan greeting untuk Ibu Sari, Direktur PT Maju"
- "Ada pesan kontak baru? Tandai yang dari Budi sudah dibalas"

Endpoint: `https://<domain>/api/mcp` (Streamable HTTP, `api/mcp.js`), tools di
`mcp/tools.mjs`. Agent masuk dengan token dari menu **Akses AI** di panel.
Token bertindak sebagai akun pembuatnya, dengan role akun itu saat dipakai:

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
| Perusahaan  | `get_company_settings`, `update_company_settings`, `set_catalog_pdf` (URL) |
| Greeting    | `get_greeting`, `update_greeting` |
| Pesan       | `list_messages`, `get_message`, `set_message_status`, `delete_message` |
| Pengguna    | `list_users`, `create_user`, `update_user`, `remove_user` |

Foto dikirim agent sebagai base64 (agent membaca file di komputer pengguna)
atau URL. Server mengompresnya seperti panel (1600 px dan 640 px), mengunggah
ke R2, dan foto yang dihapus ikut dihapus dari R2. Maksimal 10 foto per unit;
foto pertama jadi cover. Upload PDF katalog tetap lewat panel.

## Menghubungkan

1. Login ke panel, buka tab **Akses AI**, buat token (beri nama sesuai
   perangkat/agent, pilih masa berlaku). Token hanya tampil sekali.
2. Pasang di agent. Perintah lengkap dengan domain ada di halaman itu:
   - Claude Code:
     `claude mcp add --transport http imt-admin https://<domain>/api/mcp --header "Authorization: Bearer <TOKEN>"`
   - Codex (`~/.codex/config.toml`), token di env `IMT_MCP_TOKEN`:
     ```toml
     [mcp_servers.imt-admin]
     url = "https://<domain>/api/mcp"
     bearer_token_env_var = "IMT_MCP_TOKEN"
     ```
3. Tabel di Akses AI menampilkan agent terakhir, kapan terakhir dipakai, dan
   tanda **Aktif** bila dipakai dalam 10 menit terakhir. Admin melihat token
   semua pengguna. **Cabut** menghentikan akses pada permintaan berikutnya.
   Token juga berhenti bekerja bila kedaluwarsa atau pemiliknya dihapus.

Tabel `ai_tokens` hanya menyimpan hash SHA-256 dari token. Endpoint memakai
service key Supabase (melewati RLS), jadi pembatasan role dijalankan oleh
`mcp/tools.mjs`. Server butuh env yang sama dengan `api/` lainnya (lihat
`.env.example`); `update_greeting` butuh `FIREBASE_SERVICE_ACCOUNT`.
