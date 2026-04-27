import { useState } from "react";
import { useData } from "../../context/DataContext";

const empty = { id: "", name: "", slug: "", description: "" };

export default function AdminCategories() {
  const { categories, vehicles, upsertCategory, deleteCategory } = useData();
  const [draft, setDraft] = useState(empty);
  const editing = !!draft.id;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    upsertCategory(draft);
    setDraft(empty);
  };

  const startEdit = (c) => setDraft({ ...c });
  const cancel = () => setDraft(empty);

  const onDelete = (c) => {
    const used = vehicles.filter((v) => v.categoryId === c.id).length;
    const msg = used
      ? `Kategori "${c.name}" memiliki ${used} unit. Hapus kategori dan SEMUA unit di dalamnya?`
      : `Hapus kategori "${c.name}"?`;
    if (window.confirm(msg)) deleteCategory(c.id);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Kategori</h2>
          <span className="text-sm text-slate-500">
            {categories.length} kategori
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-3">Nama</th>
              <th className="text-left px-5 py-3">Slug</th>
              <th className="text-left px-5 py-3">Unit</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {c.description}
                  </p>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-600">
                  {c.slug}
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {vehicles.filter((v) => v.categoryId === c.id).length}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-sm font-medium text-brand-700 hover:underline mr-3"
                  >
                    Ubah
                  </button>
                  <button
                    onClick={() => onDelete(c)}
                    className="text-sm font-medium text-slate-500 hover:text-brand-700"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                  Belum ada kategori. Tambahkan di panel kanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Deskripsi
          </label>
          <textarea
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
            className="flex-1 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
          >
            {editing ? "Simpan Perubahan" : "Tambah"}
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
    </div>
  );
}

function Field({ label, value, onChange, required, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
