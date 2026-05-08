import { useEffect, useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../../components/Modal";
import { isCurrentAdmin } from "../Admin";

const STATUS_NEW = "New";
const STATUS_READ = "Read";
const STATUS_REPLIED = "Replied";

const STATUS_LABEL = {
  [STATUS_NEW]: "Baru",
  [STATUS_READ]: "Dibaca",
  [STATUS_REPLIED]: "Dibalas",
};

const STATUS_TONE = {
  [STATUS_NEW]:
    "bg-secondary-100 text-secondary-800 border border-secondary-300",
  [STATUS_READ]: "bg-slate-100 text-slate-700 border border-slate-300",
  [STATUS_REPLIED]: "bg-emerald-100 text-emerald-700 border border-emerald-300",
};

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: STATUS_NEW, label: "Baru" },
  { key: STATUS_READ, label: "Dibaca" },
  { key: STATUS_REPLIED, label: "Dibalas" },
];

const tsToDate = (val) => {
  if (!val) return null;
  if (val.toDate) return val.toDate(); // Firestore Timestamp
  if (val.seconds) return new Date(val.seconds * 1000);
  if (typeof val === "string") return new Date(val);
  if (val instanceof Date) return val;
  return null;
};

const timeAgo = (val) => {
  const d = tsToDate(val);
  if (!d) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 30) return "baru saja";
  if (seconds < 60) return `${seconds} detik lalu`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFull = (val) => {
  const d = tsToDate(val);
  if (!d) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AdminMessages() {
  const { messages, setMessageStatus, deleteMessage, company } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const isAdmin = isCurrentAdmin();

  const counts = useMemo(() => {
    const c = { all: messages.length, [STATUS_NEW]: 0, [STATUS_READ]: 0, [STATUS_REPLIED]: 0 };
    messages.forEach((m) => {
      const s = m.status || STATUS_NEW;
      if (c[s] !== undefined) c[s] += 1;
    });
    return c;
  }, [messages]);

  const filtered = useMemo(() => {
    if (filter === "all") return messages;
    return messages.filter((m) => (m.status || STATUS_NEW) === filter);
  }, [messages, filter]);

  const opened = messages.find((m) => m.id === openId);

  // Auto mark-as-read when admin opens a New message.
  useEffect(() => {
    if (!opened) return;
    if ((opened.status || STATUS_NEW) === STATUS_NEW) {
      setMessageStatus(opened.id, STATUS_READ).catch((err) =>
        console.warn("mark-read failed:", err)
      );
    }
  }, [opened, setMessageStatus]);

  const onReply = async (msg) => {
    const subjectPrefix = "Re: ";
    const subject = `${subjectPrefix}${msg.subject || "Pesan dari website"}`;
    const greeting = `Halo ${msg.name},\n\nTerima kasih telah menghubungi ${
      company.shortName || company.name
    }.\n\n`;
    const quote = msg.message
      ? `\n\n—\nPesan asli Anda:\n> ${msg.message.split("\n").join("\n> ")}\n`
      : "";
    const body = `${greeting}${quote}`;
    const mailto = `mailto:${encodeURIComponent(
      msg.email
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    try {
      await setMessageStatus(msg.id, STATUS_REPLIED);
      toast.success("Status diperbarui ke Dibalas.");
    } catch (err) {
      toast.error("Gagal update status: " + (err?.message || ""));
    }
  };

  const onMarkUnread = async (msg) => {
    try {
      await setMessageStatus(msg.id, STATUS_NEW);
      toast.info('Ditandai sebagai "Baru".');
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
  };

  const onMarkRead = async (msg) => {
    try {
      await setMessageStatus(msg.id, STATUS_READ);
      toast.info('Ditandai sebagai "Dibaca".');
    } catch (err) {
      toast.error("Gagal: " + (err?.message || ""));
    }
  };

  const onDeleteConfirm = async () => {
    const m = confirmDelete;
    setConfirmDelete(null);
    if (!m) return;
    try {
      await deleteMessage(m.id);
      if (openId === m.id) setOpenId(null);
      toast.info("Pesan dihapus.");
    } catch (err) {
      toast.error("Gagal menghapus: " + (err?.message || ""));
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900">Pesan Kontak</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Total {counts.all} pesan, {counts[STATUS_NEW]} belum dibaca.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = counts[f.key] ?? 0;
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-primary-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-primary-300"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <ul className="space-y-3">
          {filtered.length === 0 && (
            <li className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500">
              Tidak ada pesan pada filter ini.
            </li>
          )}
          {filtered.map((m) => {
            const status = m.status || STATUS_NEW;
            const active = openId === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(m.id)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition hover:border-primary-300 hover:shadow-sm ${
                    active ? "border-primary-500 ring-2 ring-primary-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 truncate">
                          {m.name}
                        </p>
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            STATUS_TONE[status] || STATUS_TONE[STATUS_NEW]
                          }`}
                        >
                          {STATUS_LABEL[status] || status}
                        </span>
                      </div>
                      <p className="text-xs text-primary-700 mt-0.5 truncate">
                        {m.email}
                      </p>
                      {m.subject && (
                        <p className="mt-1 text-sm text-slate-800 font-medium truncate">
                          {m.subject}
                        </p>
                      )}
                      {m.message && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {m.message}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(m.created_at)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="lg:col-span-2">
        <div className="sticky top-20">
          {!opened ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-500">
              <p className="text-3xl">📬</p>
              <p className="mt-2 text-sm">
                Pilih pesan di kiri untuk melihat detail dan membalas.
              </p>
            </div>
          ) : (
            <article className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <header>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {opened.subject || "(tanpa subjek)"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Dari{" "}
                      <span className="font-semibold text-slate-900">
                        {opened.name}
                      </span>{" "}
                      ·{" "}
                      <a
                        href={`mailto:${opened.email}`}
                        className="text-primary-700 hover:underline"
                      >
                        {opened.email}
                      </a>
                    </p>
                    {opened.phone && (
                      <p className="text-sm text-slate-600">
                        Telp:{" "}
                        <a
                          href={`tel:${opened.phone}`}
                          className="text-primary-700 hover:underline"
                        >
                          {opened.phone}
                        </a>
                      </p>
                    )}
                    {opened.company && (
                      <p className="text-sm text-slate-600">
                        Instansi: {opened.company}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {formatFull(opened.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      STATUS_TONE[opened.status || STATUS_NEW]
                    }`}
                  >
                    {STATUS_LABEL[opened.status || STATUS_NEW]}
                  </span>
                </div>
              </header>

              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">
                {opened.message}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onReply(opened)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm"
                >
                  ✉️ Balas via Email
                </button>
                {(opened.status || STATUS_NEW) === STATUS_REPLIED ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(opened)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
                  >
                    Tandai Dibaca
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkUnread(opened)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
                  >
                    Tandai Baru
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(opened)}
                    className="ml-auto px-4 py-2 rounded-lg text-slate-500 hover:text-primary-700 font-medium text-sm"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </article>
          )}
        </div>
      </aside>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Hapus Pesan?"
        description={
          confirmDelete
            ? `Pesan dari "${confirmDelete.name}" akan dihapus permanen.`
            : ""
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={onDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
