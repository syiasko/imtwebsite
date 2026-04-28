import { useT } from "../context/LanguageContext";

// Renders a YouTube embed from a URL, video ID, or playlist URL.
// Falls back to a CTA for channel-only URLs (which can't be embedded directly).

const VIDEO_RX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const PLAYLIST_RX = /[?&]list=([a-zA-Z0-9_-]+)/;
const CHANNEL_RX = /youtube\.com\/(@[^/?#]+|channel\/UC[\w-]+|c\/[^/?#]+|user\/[^/?#]+)/;

export function parseYoutubeUrl(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: "video", id: trimmed };
  }
  const playlistMatch = trimmed.match(PLAYLIST_RX);
  const videoMatch = trimmed.match(VIDEO_RX);
  if (videoMatch) {
    return {
      type: "video",
      id: videoMatch[1],
      playlistId: playlistMatch?.[1] || null,
    };
  }
  if (playlistMatch) {
    return { type: "playlist", id: playlistMatch[1] };
  }
  const channelMatch = trimmed.match(CHANNEL_RX);
  if (channelMatch) {
    return { type: "channel", handle: channelMatch[1], url: trimmed };
  }
  return null;
}

export default function YouTubeSection({ url, title, subtitle }) {
  const { t } = useT();
  const parsed = parseYoutubeUrl(url);
  const heading = title || t("youtube.defaultTitle");

  let embedSrc = null;
  if (parsed?.type === "video") {
    embedSrc = `https://www.youtube.com/embed/${parsed.id}?rel=0&modestbranding=1${
      parsed.playlistId ? `&list=${parsed.playlistId}` : ""
    }`;
  } else if (parsed?.type === "playlist") {
    embedSrc = `https://www.youtube.com/embed/videoseries?list=${parsed.id}&rel=0&modestbranding=1`;
  }

  return (
    <section className="bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-500">
            {t("youtube.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold">{heading}</h2>
          {subtitle && (
            <p className="mt-3 text-slate-300 text-sm md:text-base">
              {subtitle}
            </p>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          {embedSrc ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <iframe
                src={embedSrc}
                title={heading}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : parsed?.type === "channel" ? (
            <div className="rounded-2xl bg-slate-800 border border-white/10 p-10 text-center">
              <p className="text-slate-300">{t("youtube.fallback")}</p>
              <a
                href={parsed.url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                {t("youtube.openChannel")}
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-800 border border-white/10 p-10 text-center text-slate-400">
              {t("youtube.notConfigured")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
