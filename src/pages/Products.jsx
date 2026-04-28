import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import VehicleCard from "../components/VehicleCard";

export default function Products() {
  const { categories, vehicles } = useData();
  const { t } = useT();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  // Keep input in sync if user navigates with a different ?q=
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const activeCategory = slug ? categories.find((c) => c.slug === slug) : null;

  const filtered = useMemo(() => {
    let list = vehicles;
    if (activeCategory) {
      list = list.filter((v) => v.categoryId === activeCategory.id);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.tagline?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.features?.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [vehicles, activeCategory, query]);

  const onQueryChange = (v) => {
    setQuery(v);
    const next = new URLSearchParams(searchParams);
    if (v.trim()) next.set("q", v);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
            {activeCategory
              ? t("products.eyebrow.category")
              : t("products.eyebrow.all")}
          </p>
          <h1 className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
            {activeCategory ? activeCategory.name : t("products.titleAll")}
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
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="w-full md:w-72 rounded-lg border border-slate-300 px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <CategoryPill to="/produk" active={!activeCategory}>
          {t("products.filterAll")}
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
            {t("products.empty")}
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
          ? "bg-primary-600 border-primary-600 text-white"
          : "bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:text-primary-700"
      }`}
    >
      {children}
    </Link>
  );
}
