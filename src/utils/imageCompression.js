// Canvas-based image compression. Targets the resulting base64 data URL size
// since we store images inline in Firestore (1MB doc cap). To fit 10 images
// in a single vehicle doc with headroom, we aim for ~90KB base64 per image.

const DEFAULT_MAX_BYTES = 90 * 1024; // ~90KB base64 — 10 images ≈ 900KB inside a 1MB Firestore doc
const DEFAULT_MAX_DIM = 1280;

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas blob failed"))),
      type,
      quality
    );
  });

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
    reader.readAsDataURL(blob);
  });

const renderToCanvas = (img, dim) => {
  const ratio = dim / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
};

// data URL string length ≈ stored bytes (it's ASCII).
const dataUrlSize = (s) => (typeof s === "string" ? s.length : 0);

export async function compressImage(file, opts = {}) {
  const {
    maxBytes = DEFAULT_MAX_BYTES,
    maxDim = DEFAULT_MAX_DIM,
    onProgress,
  } = opts;

  if (!file || !file.type?.startsWith("image/")) {
    throw new Error("Bukan file gambar.");
  }

  onProgress?.(5);
  const sourceDataUrl = await readFileAsDataURL(file);
  onProgress?.(20);

  if (dataUrlSize(sourceDataUrl) <= maxBytes) {
    onProgress?.(100);
    return {
      dataUrl: sourceDataUrl,
      compressed: false,
      originalSize: file.size,
      finalSize: dataUrlSize(sourceDataUrl),
    };
  }

  const img = await loadImage(sourceDataUrl);
  onProgress?.(40);

  let dim = Math.min(maxDim, Math.max(img.width, img.height));
  let quality = 0.85;
  let result = sourceDataUrl;
  let attempts = 0;
  const maxAttempts = 14;

  while (attempts < maxAttempts) {
    const canvas = renderToCanvas(img, dim);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    const candidate = await blobToDataURL(blob);

    if (candidate.length <= maxBytes) {
      result = candidate;
      break;
    }
    result = candidate;

    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.1);
    } else if (dim > 480) {
      dim = Math.round(dim * 0.85);
      quality = 0.7;
    } else {
      dim = Math.max(360, Math.round(dim * 0.85));
      quality = Math.max(0.4, quality - 0.05);
    }

    attempts += 1;
    onProgress?.(40 + Math.min(55, attempts * 4));
  }

  onProgress?.(100);

  return {
    dataUrl: result,
    compressed: true,
    originalSize: file.size,
    finalSize: result.length,
  };
}

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
