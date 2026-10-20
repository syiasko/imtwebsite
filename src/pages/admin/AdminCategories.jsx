import { useId, useState } from "react";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../../components/Modal";

const empty = { id: "", name: "", slug: "", description: "" };

export default function AdminCategories() {
  const { categories, vehicles, upsertCategory, deleteCategory } = useData();
  const toast = useToast();
  const [draft, setDraft] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const editing = !!draft.id;
  const descId = useId();

  const unitCount = (c) => vehicles.filter((v) => v.categoryId === c.id).length;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await upsertCategory(draft);
      toast.success(
        editing ? "Kategori diperbarui." : `Kategori "${draft.name}" ditambahkan.`
      );
      setDraft(empty);
    } catch (err) {
      toast.error("Gagal menyimpan kategori: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => setDraft({ ...c });
  const cancel = () => setDraft(empty);

  const onDeleteConfirm = async () => {
    const c = confirmDelete;
    setConfirmDelete(null);
    if (!c) return;
    try {
      await deleteCategory(c.id);
      if (draft.id === c.id) cancel();
      toast.info(`Kategori "${c.name}" dihapus.`);
    } catch (err) {
      toast.error("Gagal menghapus kategori: " + (err?.message || ""));
    }
  };

  const used = confirmDelete ? unitCount(confirmDelete) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Kategori</h2>
          <span className="text-sm text-slate-600">
            {categories.length} kategori
          </span>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-5 py-3">Nama</th>
                <th className="text-left px-5 py-3">Slug</th>
                <th className="text-left px-5 py-3">Unit</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {c.description}
                    </p>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">
                    {c.slug}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{unitCount(c)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-sm font-medium text-brand-700 hover:underline mr-3"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="text-sm font-medium text-slate-600 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                    Belum ada kategori. Tambahkan lewat form Tambah Kategori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 h-fit space-y-4"
      >
        <h2 className="font-semibold text-slate-900">
          {editing ? "Ubah Kategori" : "Tambah Kategori"}
        </h2>

        <Field
          label="Nama Kategori"
          required
          value={draft.name}
          onChange={(v) => setDraft({ ...draft, name: v })}
        />
        <Field
          label="Slug (URL)"
          value={draft.slug}
          onChange={(v) => setDraft({ ...draft, slug: v })}
          hint="Otomatis digenerate dari nama jika kosong"
        />
        <div>
          <label htmlFor={descId} className="block text-sm font-medium text-slate-700 mb-1">
            Deskripsi
          </label>
          <textarea
            id={descId}
            rows="3"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title="Hapus Kategori?"
        description={
          confirmDelete
            ? used
              ? `Kategori "${confirmDelete.name}" berisi ${used} unit. Kategori dan semua unit di dalamnya akan dihapus permanen.`
              : `Kategori "${confirmDelete.name}" akan dihapus permanen.`
            : ""
        }
        confirmLabel={used ? `Hapus kategori & ${used} unit` : "Hapus"}
        cancelLabel="Batal"
        onConfirm={onDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function Field({ label, value, onChange, required, hint }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
