// Canvas-based image compression. Targets a base64-encoded data URL size
// (since that's what we ultimately store in Firestore, capped at ~1MB/doc).
//
// Strategy: load the file as an Image, draw onto a canvas, encode as JPEG with
// stepping quality, and shrink dimensions when quality alone isn't enough.

const DEFAULT_MAX_BYTES = 700 * 1024; // ~700KB target after base64 inflation
const DEFAULT_MAX_DIM = 1920;

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

// base64 inflation factor: 4 bytes for every 3 binary bytes, plus ~30 char prefix.
const estimateBase64Size = (binarySize) => Math.ceil(binarySize * 1.37) + 30;

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

  // Tiny image already under target: keep original encoding (preserves PNG transparency etc).
  if (estimateBase64Size(file.size) <= maxBytes) {
    onProgress?.(100);
    return {
      dataUrl: sourceDataUrl,
      compressed: false,
      originalSize: file.size,
      finalSize: sourceDataUrl.length,
    };
  }

  const img = await loadImage(sourceDataUrl);
  onProgress?.(40);

  let dim = Math.min(maxDim, Math.max(img.width, img.height));
  let quality = 0.9;
  let lastBlob = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const canvas = renderToCanvas(img, dim);
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    lastBlob = blob;
    const estimated = estimateBase64Size(blob.size);

    if (estimated <= maxBytes) break;

    if (quality > 0.55) {
      quality = Math.max(0.55, quality - 0.1);
    } else if (dim > 480) {
      dim = Math.round(dim * 0.85);
      quality = 0.78;
    } else {
      // Final fallback: aggressive shrink + low quality
      dim = Math.max(360, Math.round(dim * 0.8));
      quality = Math.max(0.45, quality - 0.05);
    }

    attempts += 1;
    onProgress?.(40 + Math.min(50, attempts * 5));
  }

  onProgress?.(95);
  const finalDataUrl = await blobToDataURL(lastBlob);
  onProgress?.(100);

  return {
    dataUrl: finalDataUrl,
    compressed: true,
    originalSize: file.size,
    finalSize: finalDataUrl.length,
  };
}

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "?";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
