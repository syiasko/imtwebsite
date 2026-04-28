import { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";

const emptyDraft = {
  id: "",
  name: "",
  categoryId: "",
  tagline: "",
  description: "",
  images: [],
  specs: {},
  features: [],
};

export default function AdminVehicles() {
  const { categories, vehicles, upsertVehicle, deleteVehicle } = useData();
  const [draft, setDraft] = useState(emptyDraft);
  const [filterCat, setFilterCat] = useState("");

  const editing = !!draft.id;
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(
    () =>
      filterCat
        ? vehicles.filter((v) => v.categoryId === filterCat)
        : vehicles,
    [vehicles, filterCat]
  );

  const startEdit = (v) =>
    setDraft({
      ...v,
      images: [...(v.images || [])],
      specs: { ...(v.specs || {}) },
      features: [...(v.features || [])],
    });
  const startNew = () =>
    setDraft({
      ...emptyDraft,
      categoryId: categories[0]?.id || "",
    });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.categoryId) return;
    upsertVehicle(draft);
    startNew();
  };

  const onDelete = (v) => {
    if (window.confirm(`Hapus unit "${v.name}"?`)) deleteVehicle(v.id);
  };

  return (
    <div className="grid xl:grid-cols-5 gap-8">
      <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Kendaraan</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={startNew}
              className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
            >
              + Tambah Unit
            </button>
          </div>
        </div>

        <ul className="divide-y divide-slate-200 max-h-[70vh] overflow-y-auto">
          {filtered.map((v) => (
            <li
              key={v.id}
              className={`px-5 py-3 flex gap-3 items-start hover:bg-slate-50 ${
                draft.id === v.id ? "bg-brand-50/40" : ""
              }`}
            >
              <img
                src={v.images?.[0]}
                alt=""
                className="h-16 w-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {v.name}
                </p>
                <p className="text-xs text-slate-500">
                  {categoryById[v.categoryId]?.name || "—"} •{" "}
                  {v.images?.length || 0} foto •{" "}
                  {Object.keys(v.specs || {}).length} spesifikasi
                </p>
                {v.tagline && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                    {v.tagline}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 text-right">
                <button
                  onClick={() => startEdit(v)}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  Ubah
                </button>
                <button
                  onClick={() => onDelete(v)}
                  className="text-sm text-slate-500 hover:text-brand-700"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-slate-500">
              Belum ada unit pada filter ini.
            </li>
          )}
        </ul>
      </div>

      <VehicleForm
        key={draft.id || "new"}
        draft={draft}
        setDraft={setDraft}
        categories={categories}
        editing={editing}
        onSubmit={onSubmit}
        onCancel={startNew}
      />
    </div>
  );
}

function VehicleForm({
  draft,
  setDraft,
  categories,
  editing,
  onSubmit,
  onCancel,
}) {
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [feature, setFeature] = useState("");

  const addImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Firestore docs cap out at 1MB total. Base64 inflates by ~33%, so a 700KB
    // raw image becomes ~930KB and pushes a multi-image vehicle past the limit.
    // Cap each image at 500KB to leave headroom for other fields and other photos.
    if (file.size > 500 * 1024) {
      window.alert(
        "Ukuran gambar maks 500KB. Foto disimpan sebagai base64 di Firestore (limit 1MB per dokumen). Kompres dulu pakai TinyPNG / Squoosh."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft({ ...draft, images: [...draft.images, reader.result] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addImageUrl = () => {
    const url = window.prompt("Masukkan URL gambar:");
    if (url) setDraft({ ...draft, images: [...draft.images, url] });
  };

  const removeImage = (i) =>
    setDraft({ ...draft, images: draft.images.filter((_, idx) => idx !== i) });

  const addSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setDraft({
      ...draft,
      specs: { ...draft.specs, [specKey.trim()]: specVal.trim() },
    });
    setSpecKey("");
    setSpecVal("");
  };

  const removeSpec = (key) => {
    const { [key]: _, ...rest } = draft.specs;
    setDraft({ ...draft, specs: rest });
  };

  const addFeature = () => {
    if (!feature.trim()) return;
    setDraft({ ...draft, features: [...draft.features, feature.trim()] });
    setFeature("");
  };

  const removeFeature = (i) =>
    setDraft({
      ...draft,
      features: draft.features.filter((_, idx) => idx !== i),
    });

  return (
    <form
      onSubmit={onSubmit}
      className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-5 h-fit"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          {editing ? "Ubah Unit" : "Tambah Unit Baru"}
        </h2>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Batal edit
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nama Unit *
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Kategori *
        </label>
        <select
          value={draft.categoryId}
          onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">— Pilih Kategori —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Tagline Singkat
        </label>
        <input
          type="text"
          value={draft.tagline}
          onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Deskripsi
        </label>
        <textarea
          rows="4"
          value={draft.description}
          onChange={(e) =>
            setDraft({ ...draft, description: e.target.value })
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Foto Slideshow
        </label>
        <div className="flex flex-wrap gap-2">
          {draft.images.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt=""
                className="h-20 w-24 object-cover rounded-md border border-slate-200"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-900 text-white text-xs grid place-items-center"
                aria-label="Hapus foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50">
            Upload Foto
            <input
              type="file"
              accept="image/*"
              onChange={addImage}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={addImageUrl}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            + dari URL
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Spesifikasi
        </label>
        <ul className="space-y-1 mb-2">
          {Object.entries(draft.specs).map(([k, v]) => (
            <li
              key={k}
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span>
                <span className="text-slate-500">{k}:</span>{" "}
                <span className="font-medium text-slate-800">{v}</span>
              </span>
              <button
                type="button"
                onClick={() => removeSpec(k)}
                className="text-slate-400 hover:text-brand-700"
                aria-label="Hapus spesifikasi"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Nama (mis. Chassis)"
            value={specKey}
            onChange={(e) => setSpecKey(e.target.value)}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Nilai (mis. Hino 110)"
            value={specVal}
            onChange={(e) => setSpecVal(e.target.value)}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSpec}
            className="rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Fitur Unggulan
        </label>
        <ul className="space-y-1 mb-2">
          {draft.features.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span>{f}</span>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="text-slate-400 hover:text-brand-700"
                aria-label="Hapus fitur"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Contoh: Lampu strobo LED"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addFeature}
            className="rounded-lg bg-slate-900 text-white text-sm font-semibold px-3 hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold"
      >
        {editing ? "Simpan Perubahan" : "Tambah Unit"}
      </button>
    </form>
  );
}
