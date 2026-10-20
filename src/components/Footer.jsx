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
            <h2 className="text-sm font-semibold text-secondary-400">
              {t("footer.aboutHeading")}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white">
              {company.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{company.tagline}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-secondary-400">
            {t("footer.contactHeading")}
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">{t("contact.address")}</dt>
              <dd className="whitespace-pre-line">{company.address}</dd>
            </div>
            <div>
              <dt className="text-slate-400">{t("contact.phone")}</dt>
              <dd>
                <a
                  href={`tel:${company.whatsapp || company.phone}`}
                  className="hover:text-white break-all"
                >
                  {company.whatsapp || company.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">{t("contact.email")}</dt>
              <dd>
                <a
                  href={`mailto:${company.email}`}
                  className="hover:text-white break-all"
                >
                  {company.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">{t("contact.hours")}</dt>
              <dd>{company.hours}</dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          <h2 className="text-sm font-semibold text-secondary-400 mb-3">
            {t("footer.locationHeading")}
          </h2>
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
        <div className="container mx-auto px-4 py-4 text-xs text-slate-400">
          <p>{t("footer.copyright", { year: new Date().getFullYear(), company: company.name })}</p>
        </div>
      </div>
    </footer>
  );
}
