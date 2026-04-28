import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import MapEmbed from "./MapEmbed";

export default function Footer() {
  const { company } = useData();
  const { t } = useT();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="IMT Karoseri"
              className="h-12 w-12 rounded-md object-contain bg-white p-1"
            />
            <p className="font-bold text-white text-lg">
              {company.shortName || "IMT Karoseri"}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-secondary-400">
              {t("footer.aboutHeading")}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {company.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{company.tagline}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-secondary-400">
            {t("footer.contactHeading")}
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span aria-hidden>📍</span>
              <span className="whitespace-pre-line">{company.address}</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>📞</span>
              <a
                href={`tel:${company.whatsapp || company.phone}`}
                className="hover:text-white break-all"
              >
                {company.whatsapp || company.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>✉️</span>
              <a
                href={`mailto:${company.email}`}
                className="hover:text-white break-all"
              >
                {company.email}
              </a>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>🕒</span>
              <span>{company.hours}</span>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-secondary-400 mb-3">
            {t("footer.locationHeading")}
          </p>
          <MapEmbed
            embedUrl={company.mapsEmbedUrl}
            shareUrl={company.mapsShareUrl}
            address={company.address}
            height={240}
            theme="dark"
          />
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-4 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
          <p>{t("footer.copyright", { year: new Date().getFullYear(), company: company.name })}</p>
          <p>{t("footer.poweredBy")}</p>
        </div>
      </div>
    </footer>
  );
}
