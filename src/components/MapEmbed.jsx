export default function MapEmbed({
  embedUrl,
  shareUrl,
  address,
  height = 360,
  theme = "light",
}) {
  // Auto-build a Maps embed from the address with the location marked (`q=`).
  const src =
    embedUrl ||
    (address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&z=16`
      : null);

  if (!src) return null;

  const dark = theme === "dark";
  const wrapperClass = dark
    ? "rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-800 shadow-lg"
    : "rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm";
  const ctaClass = dark
    ? "px-4 py-3 bg-slate-800 border-t border-slate-700/60 flex items-center justify-between text-sm text-slate-300"
    : "px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm";
  const linkClass = dark
    ? "font-semibold text-secondary-400 hover:text-secondary-300"
    : "font-semibold text-primary-600 hover:underline";

  return (
    <div className={wrapperClass}>
      <iframe
        src={src}
        title="Lokasi kami di Google Maps"
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {shareUrl && (
        <div className={ctaClass}>
          <span className={dark ? "text-slate-400" : "text-slate-600"}>
            Buka langsung di Google Maps
          </span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            Buka peta →
          </a>
        </div>
      )}
    </div>
  );
}
