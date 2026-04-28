import { Link } from "react-router-dom";
import { useT } from "../context/LanguageContext";

export default function VehicleCard({ vehicle, categoryName }) {
  const { t } = useT();
  const cover = vehicle.images?.[0];
  return (
    <Link
      to={`/produk/${vehicle.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={vehicle.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-400 text-sm">
            —
          </div>
        )}
      </div>
      <div className="p-5">
        {categoryName && (
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
            {categoryName}
          </span>
        )}
        <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-primary-700">
          {vehicle.name}
        </h3>
        {vehicle.tagline && (
          <p className="mt-1 text-sm text-slate-600 line-clamp-2">
            {vehicle.tagline}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {t("products.featuresCount", {
              count: vehicle.features?.length || 0,
            })}
          </span>
          <span className="font-semibold text-primary-700 group-hover:underline">
            {t("products.viewDetail")}
          </span>
        </div>
      </div>
    </Link>
  );
}
