// Vehicle photos and the catalog PDF live in Cloudflare R2 behind a public
// (CDN) URL. The database stores R2 keys; full https URLs (linked images) are
// stored as-is. Every uploaded photo has a small variant for cards/lists:
//   vehicles/<vehicleId>/<random>.jpg  and  vehicles/<vehicleId>/<random>-sm.jpg
// Shared by the browser, api/* and the MCP server.

export const PHOTO_FULL = { maxDim: 1600, maxBytes: 300 * 1024 };
export const PHOTO_SMALL = { maxDim: 640, maxBytes: 60 * 1024 };
export const MAX_PHOTOS = 10;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

const isUrl = (s) => /^(https?:|data:)/.test(s || "");

export const smallKey = (key) => key.replace(/\.(\w+)$/, "-sm.$1");

export const mediaUrl = (base, src, size = "full") => {
  if (!src) return "";
  if (isUrl(src)) return src;
  return `${base.replace(/\/$/, "")}/${size === "sm" ? smallKey(src) : src}`;
};

// Inverse of mediaUrl: URLs on our media domain go back to keys.
export const mediaKey = (base, src) => {
  const prefix = `${base.replace(/\/$/, "")}/`;
  return base && src?.startsWith(prefix) ? src.slice(prefix.length) : src;
};

export const isMediaKey = (src) => !!src && !isUrl(src);

// Small variant for a stored photo URL; linked external images stay as-is.
export const smallUrl = (base, src) => {
  const key = mediaKey(base, src);
  return isMediaKey(key) ? mediaUrl(base, key, "sm") : src;
};
