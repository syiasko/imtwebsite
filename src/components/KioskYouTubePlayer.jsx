// Strip a YouTube URL down to a video ID + optional playlist ID.
// Accepts: https://www.youtube.com/watch?v=ID, https://youtu.be/ID,
// https://www.youtube.com/embed/ID, https://www.youtube.com/shorts/ID,
// or just a bare 11-char ID.
const VIDEO_RX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const PLAYLIST_RX = /[?&]list=([a-zA-Z0-9_-]+)/;

export function parseYoutubeUrl(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return { id: trimmed, list: null };
  const playlist = trimmed.match(PLAYLIST_RX);
  const video = trimmed.match(VIDEO_RX);
  if (video) return { id: video[1], list: playlist?.[1] || null };
  if (playlist) return { id: null, list: playlist[1] };
  return null;
}

// Kiosk-safe YouTube embed. We use:
//   - `youtube-nocookie.com` (privacy-enhanced, no recommendation tracking)
//   - URL params: rel=0 (no related videos), modestbranding=1, controls=1,
//     playsinline=1, fs=0 (block fullscreen), iv_load_policy=3 (no
//     annotations), disablekb=1 (no keyboard shortcuts).
//   - sandbox="allow-scripts allow-same-origin": player works but the
//     iframe is forbidden from popping out to youtube.com / the YouTube
//     app. Without `allow-popups` and `allow-top-navigation`, clicks on
//     "Watch on YouTube" or the YouTube logo are no-ops.
//   - allowFullScreen={false}: belt + suspenders alongside fs=0.
export default function KioskYouTubePlayer({ url, title }) {
  const parsed = parseYoutubeUrl(url);
  if (!parsed?.id && !parsed?.list) return null;

  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    controls: "1",
    playsinline: "1",
    fs: "0",
    iv_load_policy: "3",
    disablekb: "1",
  });
  if (parsed.list) params.set("list", parsed.list);

  const src = parsed.id
    ? `https://www.youtube-nocookie.com/embed/${parsed.id}?${params.toString()}`
    : `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;

  return (
    <iframe
      src={src}
      title={title || "Video produk"}
      // No allow-popups / allow-top-navigation → can't escape the kiosk.
      sandbox="allow-scripts allow-same-origin allow-presentation"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen={false}
      className="absolute inset-0 w-full h-full"
      loading="lazy"
    />
  );
}
