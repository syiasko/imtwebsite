// Canvas-based image compression. Target the binary size (the file we upload
// to Firebase Storage), not base64, since we no longer store images inline.

const DEFAULT_MAX_BYTES = 1024 * 1024; // 1 MB binary
const DEFAULT_MAX_DIM = 2048;

const loadImageFromBlob = (blob) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas blob failed"))),
      type,
      quality
    );
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

  // Already small enough? return original blob (preserves PNG transparency, animated GIFs, etc).
  if (file.size <= maxBytes) {
    onProgress?.(100);
    return {
      blob: file,
      compressed: false,
      originalSize: file.size,
      finalSize: file.size,
      ext: extFromType(file.type),
    };
  }

  const img = await loadImageFromBlob(file);
  onProgress?.(30);

  let dim = Math.min(maxDim, Math.max(img.width, img.height));
  let quality = 0.9;
  let lastBlob = null;
  let attempts = 0;
  const maxAttempts = 12;

  while (attempts < maxAttempts) {
    const canvas = renderToCanvas(img, dim);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    lastBlob = blob;

    if (blob.size <= maxBytes) break;

    if (quality > 0.55) {
      quality = Math.max(0.55, quality - 0.1);
    } else if (dim > 640) {
      dim = Math.round(dim * 0.85);
      quality = 0.78;
    } else {
      dim = Math.max(480, Math.round(dim * 0.85));
      quality = Math.max(0.45, quality - 0.05);
    }

    attempts += 1;
    onProgress?.(30 + Math.min(60, attempts * 5));
  }

  onProgress?.(95);

  return {
    blob: lastBlob,
    compressed: true,
    originalSize: file.size,
    finalSize: lastBlob.size,
    ext: "jpg",
  };
}

const extFromType = (type) => {
  if (!type) return "bin";
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[type] || (type.split("/")[1] || "bin");
};

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
