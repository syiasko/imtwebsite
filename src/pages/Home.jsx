import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import VehicleCard from "../components/VehicleCard";
import YouTubeSection from "../components/YouTubeSection";
import CatalogDownloadButton from "../components/CatalogDownloadButton";
import CategorySlider from "../components/CategorySlider";
import { useLoadState } from "../components/LoadState";

export default function Home() {
  const { categories, vehicles, company } = useData();
  const { t } = useT();
  const loadState = useLoadState();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const featured = vehicles.slice(0, 6);
  const brand = company.shortName || company.name;

  return (
    <div>
      <section className="bg-primary-900 text-white">
        <div className="container mx-auto px-4 py-14 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight">
              {t("hero.title")}
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">
              {t("hero.subtitle", { brand })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/produk"
                className="inline-flex items-center px-5 py-3 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-black font-semibold"
              >
                {t("hero.ctaProducts")}
              </Link>
              <CatalogDownloadButton className="inline-flex items-center px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20">
                {t("hero.ctaCatalog")}
              </CatalogDownloadButton>
            </div>
          </div>

          <div className="hidden md:block">
            <HeroTileGrid categories={categories} vehicles={vehicles} />
          </div>
        </div>
      </section>

      <YouTubeSection
        url={company.youtubeUrl}
        title={company.youtubeSectionTitle || t("youtube.defaultTitle")}
        subtitle={company.youtubeSectionSubtitle}
      />

      <section className="container mx-auto px-4 py-16">
        <SectionHeader
          title={t("section.categoriesTitle")}
          subtitle={t("section.categoriesSubtitle")}
        />
        <div className="mt-8">
          <CategorySlider categories={categories} vehicles={vehicles} />
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <SectionHeader
            title={t("section.showcaseTitle")}
            subtitle={t("section.showcaseSubtitle")}
            cta={
              <Link
                to="/produk"
                className="text-sm font-semibold text-primary-700 hover:underline"
              >
                {t("section.allProducts")}
              </Link>
            }
          />
          <div className="mt-8">
            {loadState || (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((v) => (
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
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-primary-700 to-primary-900 text-white p-10 md:p-14 grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2">
            <h3 className="text-2xl md:text-3xl font-bold">
              {t("cta.customTitle")}
            </h3>
            <p className="mt-3 text-primary-50/90">{t("cta.customDesc")}</p>
          </div>
          <div className="flex md:justify-end">
            <Link
              to="/kontak"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-black font-semibold"
            >
              {t("cta.consult")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle, cta }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-slate-600 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {cta}
    </div>
  );
}

function HeroTileGrid({ categories, vehicles }) {
  // Pick categories that actually have at least one photo, max 4 tiles.
  const tiles = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        items: vehicles.filter(
          (v) => v.categoryId === cat.id && v.images?.length > 0
        ),
      }))
      .filter((t) => t.items.length > 0)
      .slice(0, 4);
  }, [categories, vehicles]);

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {tiles.map(({ category, items }, i) => (
        <Link
          key={category.id}
          to={`/produk/kategori/${category.slug}`}
          className={`relative block rounded-2xl overflow-hidden border border-white/10 h-44 ${
            i % 2 === 0 ? "translate-y-4" : ""
          }`}
        >
          <img
            src={items[0].images[0]}
            alt={items[0].name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2">
            <p className="text-xs font-semibold text-secondary-300">
              {category.name}
            </p>
            <p className="text-xs font-medium text-white truncate">
              {items[0].name}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
