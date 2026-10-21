import { useId, useMemo, useState, useRef } from "react";
import { useData } from "../../context/DataContext";
import { useToast } from "../../context/ToastContext";
import { ConfirmDialog } from "../../components/Modal";
import { formatBytes, preparePhoto } from "../../utils/imageCompression";
import { uploadPhoto } from "../../lib/api";
import { MAX_PHOTOS as MAX_IMAGES, smallUrl } from "../../lib/media";
import { MEDIA_BASE_URL } from "../../lib/supabase";

const emptyDraft = {
  id: "",
  name: "",
  categoryId: "",
  tagline: "",
  description: "",
  youtubeUrl: "",
  images: [],
  specs: {},
  features: [],
};

export default function AdminVehicles() {
  const { categories, vehicles, upsertVehicle, deleteVehicle } = useData();
  const toast = useToast();
  const [draft, setDraft] = useState(emptyDraft);
  const [filterCat, setFilterCat] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const tableRef = useRef(null);
  const formRef = useRef(null);

  const editing = !!draft.id;
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filtered = useMemo(
    () =>
      filterCat ? vehicles.filter((v) => v.categoryId === filterCat) : vehicles,
    [vehicles, filterCat]
  );

  const startEdit = (v) => {
    setDraft({
      ...v,
      images: [...(v.images || [])],
      specs: { ...(v.specs || {}) },
      features: [...(v.features || [])],
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const startNew = () => {
    setDraft({
      ...emptyDraft,
      categoryId: categories[0]?.id || "",
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const cancelEdit = () => {
    setDraft({
      ...emptyDraft,
      categoryId: categories[0]?.id || "",
    });
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const onSave = async (formDraft) => {
    if (!formDraft.name.trim() || !formDraft.categoryId) {
      throw new Error("Nama unit dan kategori wajib diisi.");
    }
    const saved = await upsertVehicle(formDraft);
    setDraft({
      ...saved,
      images: [...(saved.images || [])],
      specs: { ...(saved.specs || {}) },
      features: [...(saved.features || [])],
    });
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    return saved;
  };

  const onDeleteConfirm = async () => {
    const v = confirmDelete;
    setConfirmDelete(null);
    if (!v) return;
    try {
      await deleteVehicle(v);
      if (draft.id === v.id) startNew();
      toast.info(`Unit "${v.name}" dihapus.`);
    } catch (err) {
      toast.error("Gagal menghapus unit: " + (err?.message || ""));
    }
  };

  return (
    <div className="grid xl:grid-cols-5 gap-8">
      <div
        ref={tableRef}
        className="xl:col-span-3 min-w-0 bg-white rounded-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Kendaraan</h2>
          <div className="flex items-center gap-2">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              aria-label="Filter kategori"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 whitespace-nowrap"
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
                draft.id === v.id ? "bg-primary-50/40" : ""
              }`}
            >
              {v.thumbs?.[0] ? (
                <img
                  src={v.thumbs[0]}
                  loading="lazy"
                  alt=""
                  className="h-16 w-20 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                />
              ) : (
                <div className="h-16 w-20 rounded-lg bg-slate-100 flex-shrink-0 grid place-items-center text-center text-xs text-slate-600">
                  Tanpa foto
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{v.name}</p>
                <p className="text-xs text-slate-600">
                  {categoryById[v.categoryId]?.name || "Tanpa kategori"} •{" "}
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
                  className="text-sm font-medium text-primary-700 hover:underline"
                >
                  Ubah
                </button>
                <button
                  onClick={() => setConfirmDelete(v)}
                  className="text-sm text-slate-600 hover:text-red-700"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-5 py-12 text-center text-slate-600">
              {vehicles.length === 0
                ? "Belum ada unit. Klik + Tambah Unit untuk menambahkan unit pertama."
                : "Belum ada unit di kategori ini."}
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
        onSave={onSave}
        onCancel={cancelEdit}
        formRef={formRef}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title="Hapus Unit?"
        description={
          confirmDelete
            ? `Unit "${confirmDelete.name}" beserta foto dan spesifikasinya akan dihapus permanen.`
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

function VehicleForm({
  draft,
  setDraft,
  categories,
  editing,
  onSave,
  onCancel,
  formRef,
}) {
  const toast = useToast();
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [feature, setFeature] = useState("");
  const [pending, setPending] = useState([]);
  const [saving, setSaving] = useState(false);
  const ids = {
    name: useId(),
    category: useId(),
    tagline: useId(),
    description: useId(),
    youtube: useId(),
  };

  const totalImages = draft.images.length + pending.length;
  const slotsLeft = MAX_IMAGES - totalImages;
  const isUploading = pending.some((p) => !p.error);
  const submitDisabled = saving || isUploading;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (slotsLeft <= 0) {
      toast.error(`Sudah mencapai batas maksimal ${MAX_IMAGES} foto per unit.`);
      return;
    }
    const toProcess = files.slice(0, slotsLeft);
    if (files.length > slotsLeft) {
      toast.info(
        `Hanya ${slotsLeft} dari ${files.length} foto yang akan diproses (limit ${MAX_IMAGES}).`
      );
    }

    const entries = toProcess.map((file, i) => ({
      tempId: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      progress: 0,
      error: null,
      file,
    }));

    setPending((prev) => [...prev, ...entries]);

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const setProgress = (p) =>
            setPending((prev) =>
              prev.map((x) => (x.tempId === entry.tempId ? { ...x, progress: p } : x))
            );
          setProgress(10);
          const photo = await preparePhoto(entry.file);
          setProgress(50);
          const url = await uploadPhoto(draft.id || "new", photo.full, photo.small);
          setDraft((prev) => ({
            ...prev,
            images: [...prev.images, url],
          }));
          setPending((prev) => prev.filter((x) => x.tempId !== entry.tempId));
          if (photo.originalSize > photo.finalSize) {
            toast.info(
              `${entry.name} dikompres dari ${formatBytes(photo.originalSize)} ke ${formatBytes(photo.finalSize)}.`,
              { duration: 4500 }
            );
          }
        } catch (err) {
          setPending((prev) =>
            prev.map((x) =>
              x.tempId === entry.tempId
                ? { ...x, error: err.message || "Gagal memproses gambar" }
                : x
            )
          );
          toast.error(`${entry.name}: ${err.message || "Gagal memproses"}.`);
        }
      })
    );
  };

  const onFileInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const addImageUrl = () => {
    if (slotsLeft <= 0) return;
    const url = window.prompt("Masukkan URL gambar:");
    if (url) setDraft((prev) => ({ ...prev, images: [...prev.images, url] }));
  };

  const removeImage = (i) =>
    setDraft((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== i),
    }));

  const dismissPending = (id) =>
    setPending((prev) => prev.filter((p) => p.tempId !== id));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) {
      toast.error("Tunggu upload gambar selesai dulu.");
      return;
    }
    if (!draft.name.trim() || !draft.categoryId) {
      toast.error("Nama unit dan kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const wasEditing = editing;
      await onSave(draft);
      toast.success(
        wasEditing ? "Perubahan tersimpan." : `Unit "${draft.name}" ditambahkan.`
      );
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const addSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setDraft((prev) => ({
      ...prev,
      specs: { ...prev.specs, [specKey.trim()]: specVal.trim() },
    }));
    setSpecKey("");
    setSpecVal("");
  };

  const removeSpec = (key) => {
    setDraft((prev) => {
      const { [key]: _, ...rest } = prev.specs;
      return { ...prev, specs: rest };
    });
  };

  const addFeature = () => {
    if (!feature.trim()) return;
    setDraft((prev) => ({
      ...prev,
      features: [...prev.features, feature.trim()],
    }));
    setFeature("");
  };

  const removeFeature = (i) =>
    setDraft((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== i),
    }));

  return (
    <form
      ref={formRef}
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
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Batal edit
          </button>
        )}
      </div>

      <div>
        <label htmlFor={ids.name} className="block text-sm font-medium text-slate-700 mb-1">
          Nama Unit *
        </label>
        <input
          id={ids.name}
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
        />
      </div>

      <div>
        <label htmlFor={ids.category} className="block text-sm font-medium text-slate-700 mb-1">
          Kategori *
        </label>
        <select
          id={ids.category}
          value={draft.categoryId}
          onChange={(e) =>
            setDraft((p) => ({ ...p, categoryId: e.target.value }))
          }
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Pilih kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={ids.tagline} className="block text-sm font-medium text-slate-700 mb-1">
          Tagline Singkat
        </label>
        <input
          id={ids.tagline}
          type="text"
          value={draft.tagline}
          onChange={(e) => setDraft((p) => ({ ...p, tagline: e.target.value }))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
        />
      </div>

      <div>
        <label htmlFor={ids.description} className="block text-sm font-medium text-slate-700 mb-1">
          Deskripsi
        </label>
        <textarea
          id={ids.description}
          rows="4"
          value={draft.description}
          onChange={(e) =>
            setDraft((p) => ({ ...p, description: e.target.value }))
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
        />
      </div>

      <div>
        <label htmlFor={ids.youtube} className="block text-sm font-medium text-slate-700 mb-1">
          URL Video YouTube
        </label>
        <input
          id={ids.youtube}
          type="url"
          value={draft.youtubeUrl || ""}
          onChange={(e) =>
            setDraft((p) => ({ ...p, youtubeUrl: e.target.value }))
          }
          placeholder="https://www.youtube.com/watch?v=XXXXXXXX"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
        />
        <p className="mt-1 text-xs text-slate-600">
          Video akan tampil di slideshow detail unit (signage & web). Kosongkan
          jika tidak ada video.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="block text-sm font-medium text-slate-700">
            Foto Slideshow
          </p>
          <span
            className={`text-xs font-semibold ${
              totalImages >= MAX_IMAGES
                ? "text-secondary-700"
                : "text-slate-600"
            }`}
          >
            {totalImages} / {MAX_IMAGES}
          </span>
        </div>

        {(draft.images.length > 0 || pending.length > 0) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {draft.images.map((src, i) => (
              <div
                key={`img-${i}`}
                className="relative aspect-[4/3] rounded-md overflow-hidden border border-slate-200 bg-slate-100"
              >
                <img
                  src={smallUrl(MEDIA_BASE_URL, src)}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 h-8 w-8 rounded-full bg-slate-900/80 text-white text-sm grid place-items-center hover:bg-slate-900"
                  aria-label={`Hapus foto ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
            {pending.map((p) => (
              <PendingTile
                key={p.tempId}
                pending={p}
                onDismiss={() => dismissPending(p.tempId)}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {slotsLeft > 0 && (
            <>
              {/* sr-only (not display:none) keeps the file input reachable by Tab */}
              <label
                className={`cursor-pointer text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-primary-600 ${
                  isUploading ? "opacity-60" : ""
                }`}
              >
                Upload Foto ({slotsLeft} slot tersisa)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFileInputChange}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={addImageUrl}
                className="text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                + dari URL
              </button>
            </>
          )}
          {slotsLeft <= 0 && (
            <p className="text-xs text-secondary-700 bg-secondary-50 border border-secondary-200 rounded px-3 py-2">
              Sudah mencapai batas maksimal {MAX_IMAGES} foto. Hapus salah
              satu untuk mengganti.
            </p>
          )}
        </div>
        <p className="mt-1.5 text-xs text-slate-600">
          Bisa pilih beberapa foto sekaligus. Foto otomatis dikecilkan (sisi
          terpanjang 1600 px) sebelum diunggah. Foto pertama jadi cover.
        </p>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700 mb-1">
          Spesifikasi
        </p>
        <ul className="space-y-1 mb-2">
          {Object.entries(draft.specs).map(([k, v]) => (
            <li
              key={k}
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded px-3 py-1.5"
            >
              <span>
                <span className="text-slate-600">{k}:</span>{" "}
                <span className="font-medium text-slate-800">{v}</span>
              </span>
              <button
                type="button"
                onClick={() => removeSpec(k)}
                className="h-8 w-8 -my-1 grid place-items-center rounded text-slate-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`Hapus spesifikasi ${k}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-5 gap-2">
          <input
            type="text"
            aria-label="Nama spesifikasi"
            placeholder="Nama (mis. Chassis)"
            value={specKey}
            onChange={(e) => setSpecKey(e.target.value)}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            aria-label="Nilai spesifikasi"
            placeholder="Nilai (mis. Hino 110)"
            value={specVal}
            onChange={(e) => setSpecVal(e.target.value)}
            className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSpec}
            aria-label="Tambah spesifikasi"
            className="rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <p className="block text-sm font-medium text-slate-700 mb-1">
          Fitur Unggulan
        </p>
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
                className="h-8 w-8 -my-1 grid place-items-center rounded text-slate-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`Hapus fitur ${f}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="Fitur unggulan baru"
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
            aria-label="Tambah fitur"
            className="rounded-lg bg-slate-900 text-white text-sm font-semibold px-3 hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isUploading
          ? "Menunggu upload selesai..."
          : saving
          ? "Menyimpan..."
          : editing
          ? "Simpan Perubahan"
          : "Tambah Unit"}
      </button>
    </form>
  );
}

function PendingTile({ pending, onDismiss }) {
  const { progress, error, name } = pending;
  return (
    <div className="relative aspect-[4/3] rounded-md overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 grid place-items-center">
      <div className="text-center px-2">
        {error ? (
          <>
            <p className="text-xs font-semibold text-red-700">Gagal</p>
            <p className="text-xs text-red-700 mt-1 line-clamp-2">
              {error}
            </p>
          </>
        ) : (
          <>
            <Spinner />
            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
              {name}
            </p>
            <div className="mt-1.5 h-1 w-16 mx-auto bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${Math.min(100, Math.round(progress))}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {Math.round(progress)}%
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-1 right-1 h-8 w-8 rounded-full bg-slate-900/80 text-white text-sm grid place-items-center hover:bg-slate-900"
        aria-label={`Batalkan ${name}`}
      >
        ×
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="mx-auto h-6 w-6 animate-spin text-primary-600"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
      />
    </svg>
  );
}
