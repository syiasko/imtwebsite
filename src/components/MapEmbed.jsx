export default function MapEmbed({ embedUrl, shareUrl, address, height = 360 }) {
  const src =
    embedUrl ||
    (address
      ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
      : null);

  if (!src) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <iframe
        src={src}
        title="Lokasi kami di Google Maps"
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {shareUrl && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-sm">
          <span className="text-slate-600">Buka langsung di Google Maps</span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary-600 hover:underline"
          >
            Buka peta →
          </a>
        </div>
      )}
    </div>
  );
}
