// Media for the admin panel: presigned R2 uploads and deletes (staff only).
// POST { action: "presign-photo", vehicleId }  -> { key, url, urlSm }
// POST { action: "presign-pdf", size }         -> { key, url }
// POST { action: "delete", keys: [...] }       -> { deleted }
import { HttpError, jsonHandler } from "../server/http.mjs";
import { requireStaff } from "../server/supabase.mjs";
import {
  deleteMediaKeys,
  newPdfKey,
  newPhotoKey,
  presignPut,
  smallKey,
} from "../server/r2.mjs";
import { MAX_PDF_BYTES } from "../src/lib/media.js";

export default jsonHandler(async (req, body) => {
  const user = await requireStaff(req, { admin: body.action === "presign-pdf" });
  switch (body.action) {
    case "presign-photo": {
      const key = newPhotoKey(body.vehicleId);
      const [url, urlSm] = await Promise.all([
        presignPut(key, "image/jpeg"),
        presignPut(smallKey(key), "image/jpeg"),
      ]);
      return { key, url, urlSm };
    }
    case "presign-pdf": {
      if (!(body.size > 0) || body.size > MAX_PDF_BYTES) {
        throw new HttpError(400, "PDF maksimal 20 MB.");
      }
      const key = newPdfKey();
      return { key, url: await presignPut(key, "application/pdf") };
    }
    case "delete": {
      if (!Array.isArray(body.keys) || body.keys.length > 50) {
        throw new HttpError(400, "keys harus berupa daftar (maks 50).");
      }
      return { deleted: await deleteMediaKeys(body.keys), by: user.username };
    }
    default:
      throw new HttpError(400, "action tidak dikenal.");
  }
});
