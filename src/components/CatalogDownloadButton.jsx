import { useState } from "react";
import { useData } from "../context/DataContext";
import { useT } from "../context/LanguageContext";
import { trackEvent } from "../firebase/config";
import Modal from "./Modal";

export default function CatalogDownloadButton({
  className = "",
  children,
}) {
  const { company } = useData();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const hasPdf = !!company.catalogPdfUrl;

  const triggerDownload = () => {
    if (!hasPdf) {
      window.open("/katalog-cetak", "_blank");
      setOpen(false);
      return;
    }
    trackEvent("catalog_download");
    const a = document.createElement("a");
    a.href = company.catalogPdfUrl;
    a.download = company.catalogPdfName || "katalog.pdf";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          "inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold"
        }
      >
        {children || t("nav.catalog")}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("catalog.confirmTitle")}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-white"
            >
              {t("catalog.confirmNo")}
            </button>
            <button
              type="button"
              onClick={triggerDownload}
              className="px-4 py-2 rounded-lg font-semibold bg-primary-600 hover:bg-primary-700 text-white"
            >
              {hasPdf ? t("catalog.confirmYes") : t("catalog.openPrint")}
            </button>
          </>
        }
      >
        <p className="text-sm">
          {hasPdf ? t("catalog.confirmDesc") : t("catalog.noPdf")}
        </p>
        {hasPdf && company.catalogPdfName && (
          <p className="mt-3 text-xs text-slate-500">
            📄 {company.catalogPdfName}
          </p>
        )}
      </Modal>
    </>
  );
}
