// Canvas-based photo preparation before upload to R2: every photo is
// re-encoded as JPEG in two sizes (see src/lib/media.js), shrinking quality
// and then dimensions until each fits its byte budget.
import { PHOTO_FULL, PHOTO_SMALL } from "../lib/media";

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibaca."));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengompres gambar."))),
      "image/jpeg",
      quality
    );
  });

const renderToCanvas = (img, dim) => {
  const ratio = Math.min(1, dim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
};

const encode = async (img, { maxDim, maxBytes }) => {
  let dim = maxDim;
  let quality = 0.85;
  let blob = null;
  for (let attempt = 0; attempt < 14; attempt++) {
    blob = await canvasToBlob(renderToCanvas(img, dim), quality);
    if (blob.size <= maxBytes) return blob;
    if (quality > 0.6) quality = Math.max(0.6, quality - 0.08);
    else {
      dim = Math.round(dim * 0.85);
      quality = 0.75;
    }
  }
  return blob;
};

export async function preparePhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Bukan file gambar.");
  const img = await loadImage(file);
  const [full, small] = await Promise.all([encode(img, PHOTO_FULL), encode(img, PHOTO_SMALL)]);
  return { full, small, originalSize: file.size, finalSize: full.size };
}

export const formatBytes = (n) => {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
