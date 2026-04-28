import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "./config";

export const storage = getStorage(app);

const randomTag = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function uploadVehicleImage({
  vehicleId,
  blob,
  ext = "jpg",
  onProgress,
}) {
  const path = `vehicles/${vehicleId || "drafts"}/${randomTag()}.${ext}`;
  const fileRef = ref(storage, path);
  const task = uploadBytesResumable(fileRef, blob, {
    contentType: blob.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
          onProgress?.(pct);
        }
      },
      (err) => {
        const friendly = friendlyStorageError(err);
        reject(friendly);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, path, size: blob.size });
        } catch (err) {
          reject(friendlyStorageError(err));
        }
      }
    );
  });
}

export async function deleteVehicleImage(urlOrPath) {
  if (!urlOrPath) return false;
  // Best-effort: only attempt deletion for things that look like Storage refs.
  try {
    const fileRef = ref(storage, urlOrPath);
    await deleteObject(fileRef);
    return true;
  } catch {
    // External URL, missing object, or permission — ignore.
    return false;
  }
}

const friendlyStorageError = (err) => {
  const code = err?.code || "";
  let msg = err?.message || "Upload gagal.";
  if (code === "storage/unauthorized") {
    msg =
      "Akses Storage ditolak. Aktifkan Storage di Firebase Console & pasang storage rules (firestore.rules tidak berlaku untuk Storage).";
  } else if (code === "storage/canceled") {
    msg = "Upload dibatalkan.";
  } else if (code === "storage/quota-exceeded") {
    msg = "Quota Storage habis.";
  } else if (code === "storage/unauthenticated") {
    msg = "Sesi auth hilang. Refresh halaman & coba lagi.";
  }
  const wrapped = new Error(msg);
  wrapped.code = code;
  return wrapped;
};

// Detects whether a stored image URL points at our Firebase Storage bucket
// (and is therefore worth attempting to delete on remove).
export const isStorageUrl = (url) =>
  typeof url === "string" &&
  (url.startsWith("gs://") ||
    url.includes("firebasestorage.googleapis.com") ||
    url.includes("firebasestorage.app"));
