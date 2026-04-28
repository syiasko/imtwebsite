import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "../context/LanguageContext";

const CATEGORY_ICONS = {
  pemadam: "🚒",
  ambulance: "🚑",
  "golf-car": "⛳",
  rantis: "🛡️",
  "food-truck": "🍔",
  satelit: "📡",
};

export default function CategorySlider({ categories, vehicles }) {
  const { t } = useT();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const recompute = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 1;
    setOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < max,
    });
    const cards = Array.from(el.children);
    if (cards.length === 0) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    cards.forEach((c, i) => {
      const cardCenter = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    setActiveIndex(closestIdx);
  };

  useEffect(() => {
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[i];
    if (!card) return;
    el.scrollTo({
      left: card.offsetLeft - el.offsetLeft,
      behavior: "smooth",
    });
  };

  const next = () => {
    const target = Math.min(categories.length - 1, activeIndex + 1);
    scrollToIndex(target);
  };
  const prev = () => {
    const target = Math.max(0, activeIndex - 1);
    scrollToIndex(target);
  };

  if (categories.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={recompute}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-4 px-4 no-scrollbar"
      >
        {categories.map((c) => {
          const count = vehicles.filter((v) => v.categoryId === c.id).length;
          const icon = CATEGORY_ICONS[c.id] || "🚛";
          return (
            <Link
              key={c.id}
              to={`/produk/kategori/${c.slug}`}
              className="group relative flex-shrink-0 snap-start w-[85%] sm:w-[55%] md:w-[42%] lg:w-[32%] xl:w-[26%]"
            >
              <div className="h-full p-6 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-xl transition flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 grid place-items-center text-2xl">
                    {icon}
                  </div>
                  <span className="text-secondary-500 text-2xl group-hover:translate-x-1 transition">
                    →
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-primary-700">
                  {c.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 flex-1 line-clamp-3">
                  {c.description}
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wide text-slate-400">
                    {t("section.unitsAvailable", { count })}
                  </span>
                  <span className="font-semibold text-primary-700 group-hover:underline">
                    {t("products.viewDetail")}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Edge fades */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-50 to-transparent transition-opacity ${
          overflow.left ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-50 to-transparent transition-opacity ${
          overflow.right ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />

      {/* Arrow buttons */}
      <button
        type="button"
        onClick={prev}
        disabled={!overflow.left}
        aria-label="Sebelumnya"
        className="hidden md:grid absolute -left-3 top-1/2 -translate-y-1/2 h-11 w-11 place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-primary-600 hover:text-white hover:border-primary-600 disabled:opacity-0 disabled:pointer-events-none transition"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        disabled={!overflow.right}
        aria-label="Berikutnya"
        className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 h-11 w-11 place-items-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-primary-600 hover:text-white hover:border-primary-600 disabled:opacity-0 disabled:pointer-events-none transition"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {categories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Slide ${i + 1}: ${c.name}`}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex
                ? "w-7 bg-primary-600"
                : "w-2 bg-slate-300 hover:bg-slate-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
