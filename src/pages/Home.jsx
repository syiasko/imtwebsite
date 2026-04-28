import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import VehicleCard from "../components/VehicleCard";
import YouTubeSection from "../components/YouTubeSection";
import CatalogDownloadButton from "../components/CatalogDownloadButton";
import CategorySlider from "../components/CategorySlider";

export default function Home() {
  const { categories, vehicles, company } = useData();
  const { t } = useT();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const featured = vehicles.slice(0, 6);
  const brand = company.shortName || company.name;

  return (
    <div>
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #00428f 0%, transparent 50%), radial-gradient(circle at 80% 80%, #feae00 0%, transparent 60%)",
          }}
        />
        <div className="relative container mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block bg-secondary-500/20 text-secondary-300 text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full">
              {t("hero.eyebrow")}
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
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
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <Stat value={`${vehicles.length}+`} label={t("hero.statUnits")} />
              <Stat value={`${categories.length}`} label={t("hero.statCategories")} />
              <Stat value="20+" label={t("hero.statExperience")} />
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((v, i) => (
                <div
                  key={v.id}
                  className={`rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${
                    i % 2 === 0 ? "translate-y-4" : ""
                  }`}
                >
                  <img
                    src={v.images?.[0]}
                    alt={v.name}
                    className="w-full h-44 object-cover"
                  />
                </div>
              ))}
            </div>
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
          eyebrow={t("section.categoriesEyebrow")}
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
            eyebrow={t("section.showcaseEyebrow")}
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {featured.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                categoryName={categoryById[v.categoryId]?.name}
              />
            ))}
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

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle, cta }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
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
