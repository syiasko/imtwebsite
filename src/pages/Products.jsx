import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import VehicleCard from "../components/VehicleCard";

export default function Products() {
  const { categories, vehicles } = useData();
  const { slug } = useParams();
  const [query, setQuery] = useState("");

  const activeCategory = slug
    ? categories.find((c) => c.slug === slug)
    : null;

  const filtered = useMemo(() => {
    let list = vehicles;
    if (activeCategory) {
      list = list.filter((v) => v.categoryId === activeCategory.id);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.tagline?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicles, activeCategory, query]);

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            {activeCategory ? "Kategori" : "Katalog Produk"}
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
            {activeCategory ? activeCategory.name : "Semua Kendaraan"}
          </h1>
          {activeCategory?.description && (
            <p className="mt-2 text-slate-600 max-w-2xl">
              {activeCategory.description}
            </p>
          )}
        </div>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari unit..."
            className="w-full md:w-72 rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <CategoryPill to="/produk" active={!activeCategory}>
          Semua
        </CategoryPill>
        {categories.map((c) => (
          <CategoryPill
            key={c.id}
            to={`/produk/kategori/${c.slug}`}
            active={activeCategory?.id === c.id}
          >
            {c.name}
          </CategoryPill>
        ))}
      </div>

      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
            Tidak ada unit yang cocok dengan pencarian.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                categoryName={categoryById[v.categoryId]?.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryPill({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
        active
          ? "bg-brand-600 border-brand-600 text-white"
          : "bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {children}
    </Link>
  );
}
