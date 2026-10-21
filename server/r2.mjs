// Cloudflare R2 (S3 API) access for media. Browsers upload with short-lived
// presigned PUT URLs; the server deletes objects and uploads from MCP/scripts.
import { randomUUID } from "node:crypto";
import { AwsClient } from "aws4fetch";
import { HttpError } from "./http.mjs";
import { smallKey } from "../src/lib/media.js";

// Keys are unique per upload, so files never change: cache them for a year.
export const IMMUTABLE = "public, max-age=31536000, immutable";

let client = null;
const r2 = () => {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new HttpError(503, "Konfigurasi R2 belum lengkap di server.");
  }
  if (!client) {
    client = {
      aws: new AwsClient({
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        service: "s3",
        region: "auto",
      }),
      base: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`,
    };
  }
  return client;
};

const objectUrl = (key) => `${r2().base}/${key.split("/").map(encodeURIComponent).join("/")}`;

export const newPhotoKey = (vehicleId) => {
  const folder = String(vehicleId || "new").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60) || "new";
  return `vehicles/${folder}/${randomUUID()}.jpg`;
};
export const newPdfKey = () => `catalog/${randomUUID()}.pdf`;
export { smallKey };

export const isManagedKey = (key) =>
  typeof key === "string" && /^(vehicles|catalog)\/[a-z0-9/-]+\.(jpg|pdf)$/.test(key);

export const presignPut = async (key, contentType, expiresSec = 600) => {
  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await r2().aws.sign(
    new Request(url, {
      method: "PUT",
      headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE },
    }),
    { aws: { signQuery: true } }
  );
  return signed.url;
};

export const putObject = async (key, body, contentType) => {
  const res = await r2().aws.fetch(objectUrl(key), {
    method: "PUT",
    body,
    headers: { "Content-Type": contentType, "Cache-Control": IMMUTABLE },
  });
  if (!res.ok) throw new Error(`R2 PUT ${key} gagal: ${res.status} ${await res.text()}`);
};

export const deleteObject = async (key) => {
  const res = await r2().aws.fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 DELETE ${key} gagal: ${res.status}`);
};

// Deletes photos (both sizes) and PDFs we manage; other strings are ignored.
export const deleteMediaKeys = async (keys) => {
  const all = keys
    .filter(isManagedKey)
    .flatMap((k) => (k.startsWith("vehicles/") ? [k, smallKey(k)] : [k]));
  await Promise.all(all.map(deleteObject));
  return all.length;
};
