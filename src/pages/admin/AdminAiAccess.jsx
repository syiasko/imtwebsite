import { useEffect, useId, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../../components/Modal";
import {
  createAiTokenDoc,
  deleteAiTokenDoc,
  subscribeAiTokens,
} from "../../firebase/api";
import { ACTIVE_WINDOW_MS, generateToken } from "../../utils/aiToken";

const EXPIRY_OPTIONS = [
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
  { value: "365", label: "1 tahun" },
  { value: "", label: "Tidak ada" },
];

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Token page for the hosted MCP endpoint: every user creates tokens that act
// as themselves; admins also see and can revoke everyone else's.
export default function AdminAiAccess() {
  const { uid, isAdmin } = useAuth();
  const { users } = useData();
  const toast = useToast();
  const [tokens, setTokens] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const nameId = useId();
  const expiryId = useId();

  useEffect(
    () =>
      subscribeAiTokens(
        isAdmin ? null : uid,
        (rows) => {
          setTokens(rows);
          setLoadError("");
        },
        (err) => setLoadError(err.message || "Gagal memuat token.")
      ),
    [uid, isAdmin]
  );

  // Keep the "Aktif" badges honest without a reload.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  const endpoint = `${window.location.origin}/api/mcp`;
  const ownerName = (id) =>
    id === uid
      ? "Anda"
      : users.find((u) => u.id === id)?.username || "user dihapus";

  const rows = useMemo(
    () =>
      [...(tokens || [])].sort((a, b) =>
        (b.lastUsedAt || b.createdAt || "").localeCompare(a.lastUsedAt || a.createdAt || "")
      ),
    [tokens]
  );
  const activeCount = rows.filter(
    (t) => t.lastUsedAt && now - Date.parse(t.lastUsedAt) < ACTIVE_WINDOW_MS
  ).length;

  const onCreate = async (e) => {
    e.preventDefault();
    const label = name.trim();
    if (!label) return;
    setCreating(true);
    try {
      const { id, token, prefix, tokenHash } = await generateToken();
      const createdAt = new Date();
      const expiresAt = expiry
        ? new Date(createdAt.getTime() + Number(expiry) * 86400000).toISOString()
        : null;
      await createAiTokenDoc(id, {
        uid,
        name: label,
        prefix,
        tokenHash,
        createdAt: createdAt.toISOString(),
        expiresAt,
      });
      setCreated({ name: label, token });
      setName("");
    } catch (err) {
      toast.error("Gagal membuat token: " + (err?.message || ""));
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async () => {
    const t = confirmRevoke;
    setConfirmRevoke(null);
    if (!t) return;
    try {
      await deleteAiTokenDoc(t.id);
      toast.info(`Token "${t.name}" dicabut.`);
    } catch (err) {
      toast.error("Gagal mencabut token: " + (err?.message || ""));
    }
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} disalin.`);
    } catch {
      toast.error("Tidak bisa menyalin. Pilih teksnya lalu salin manual.");
    }
  };

  const status = (t) => {
    if (t.expiresAt && Date.parse(t.expiresAt) < now) {
      return <span className="text-red-700 font-medium">Kedaluwarsa</span>;
    }
    if (!t.lastUsedAt) return <span className="text-slate-600">Belum dipakai</span>;
    const active = now - Date.parse(t.lastUsedAt) < ACTIVE_WINDOW_MS;
    return (
      <span className="inline-flex items-center gap-1.5">
        {active && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Aktif
          </span>
        )}
        <span className="text-slate-700">{dateFmt.format(new Date(t.lastUsedAt))}</span>
      </span>
    );
  };

  const claudeCmd = `claude mcp add --transport http imt-admin ${endpoint} --header "Authorization: Bearer <TOKEN>"`;
  const codexToml = `[mcp_servers.imt-admin]
url = "${endpoint}"
bearer_token_env_var = "IMT_MCP_TOKEN"`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Akses AI</h2>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          Token untuk AI agent (Claude Code, Codex, Cursor, dan lainnya) agar bisa
          mengelola kategori, unit, pesan, dan pengaturan website lewat MCP. Token
          bertindak sebagai akun Anda, dengan izin sesuai role Anda saat dipakai.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-900">
              {isAdmin ? "Token semua pengguna" : "Token Anda"}
            </h3>
            <span className="text-sm text-slate-600">
              {activeCount > 0
                ? `${activeCount} sesi aktif dalam 10 menit terakhir`
                : "Tidak ada sesi aktif"}
            </span>
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-5 py-3">Nama</th>
                  {isAdmin && <th className="text-left px-5 py-3">Pemilik</th>}
                  <th className="text-left px-5 py-3">Agent</th>
                  <th className="text-left px-5 py-3">Terakhir dipakai</th>
                  <th className="text-left px-5 py-3">Kedaluwarsa</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{t.name}</p>
                      <p className="font-mono text-xs text-slate-600">{t.prefix}...</p>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-slate-700">{ownerName(t.uid)}</td>
                    )}
                    <td className="px-5 py-3 text-slate-700">
                      {t.lastClient || <span className="text-slate-500">Belum diketahui</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{status(t)}</td>
                    <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                      {t.expiresAt ? dayFmt.format(new Date(t.expiresAt)) : "Tidak ada"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setConfirmRevoke(t)}
                        className="text-sm font-medium text-slate-600 hover:text-red-700"
                      >
                        Cabut
                      </button>
                    </td>
                  </tr>
                ))}
                {tokens && rows.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-slate-600">
                      Belum ada token. Buat token lewat form Token baru, lalu pasang
                      di AI agent Anda.
                    </td>
                  </tr>
                )}
                {!tokens && !loadError && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-5 py-10 text-center text-slate-600">
                      Memuat token...
                    </td>
                  </tr>
                )}
                {loadError && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} role="alert" className="px-5 py-10 text-center text-red-700">
                      {loadError}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form
          onSubmit={onCreate}
          className="bg-white rounded-2xl border border-slate-200 p-5 h-fit space-y-4"
        >
          <h3 className="font-semibold text-slate-900">Token baru</h3>
          <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-slate-700 mb-1">
              Nama
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Claude Code di laptop kantor"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
          <div>
            <label htmlFor={expiryId} className="block text-sm font-medium text-slate-700 mb-1">
              Kedaluwarsa
            </label>
            <select
              id={expiryId}
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60"
          >
            {creating ? "Membuat..." : "Buat token"}
          </button>

          {created && (
            <div role="status" className="rounded-lg border border-secondary-500 bg-secondary-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Token "{created.name}" dibuat
              </p>
              <p className="text-xs text-slate-700">
                Salin sekarang. Token ini hanya ditampilkan sekali dan tidak bisa
                dilihat lagi.
              </p>
              <code className="block break-all rounded bg-white border border-slate-200 px-2 py-1.5 font-mono text-xs text-slate-900">
                {created.token}
              </code>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copy(created.token, "Token")}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold"
                >
                  Salin token
                </button>
                <button
                  type="button"
                  onClick={() => setCreated(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-white"
                >
                  Sudah disalin
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <h3 className="font-semibold text-slate-900">Cara menghubungkan</h3>
        <Snippet label="Endpoint MCP (Streamable HTTP)" text={endpoint} onCopy={copy} />
        <Snippet
          label="Claude Code (ganti <TOKEN> dengan token Anda)"
          text={claudeCmd}
          onCopy={copy}
        />
        <Snippet
          label="Codex CLI (~/.codex/config.toml), token disimpan di env IMT_MCP_TOKEN"
          text={codexToml}
          onCopy={copy}
        />
        <p className="text-sm text-slate-600">
          Agent lain: tambahkan server MCP dengan URL di atas dan header{" "}
          <code className="font-mono text-xs">Authorization: Bearer &lt;token&gt;</code>.
          Cabut token kapan saja di tabel di atas; akses berhenti pada permintaan
          berikutnya.
        </p>
      </section>

      <ConfirmDialog
        open={!!confirmRevoke}
        tone="danger"
        title="Cabut token?"
        description={
          confirmRevoke
            ? `Agent yang memakai token "${confirmRevoke.name}" langsung kehilangan akses. Tindakan ini tidak bisa dibatalkan.`
            : ""
        }
        confirmLabel="Cabut token"
        cancelLabel="Batal"
        onConfirm={onRevoke}
        onCancel={() => setConfirmRevoke(null)}
      />
    </div>
  );
}

function Snippet({ label, text, onCopy }) {
  return (
    <div>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <div className="flex items-start gap-2">
        <pre className="flex-1 min-w-0 overflow-x-auto rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900">
          {text}
        </pre>
        <button
          type="button"
          onClick={() => onCopy(text, label.split(" (")[0])}
          className="shrink-0 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Salin
        </button>
      </div>
    </div>
  );
}
