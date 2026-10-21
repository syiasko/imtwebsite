// The signage TV app reads settings/greeting from Firestore, so the greeting
// is written there with the Firebase Admin SDK (FIREBASE_SERVICE_ACCOUNT).
import { HttpError } from "./http.mjs";

export const GREETING_FIELDS = {
  isActive: "boolean",
  text: "string",
  guestGender: "string",
  guestName: "string",
  guestTitle: "string",
  guestCompany: "string",
};
const GENDERS = ["Bapak", "Ibu", "Bapak/Ibu"];

let dbPromise = null;
const firestore = () => {
  if (!dbPromise) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIRESTORE_EMULATOR_HOST) {
      throw new HttpError(503, "FIREBASE_SERVICE_ACCOUNT belum di-set di server, greeting tidak bisa disimpan.");
    }
    dbPromise = (async () => {
      const { cert, getApps, initializeApp } = await import("firebase-admin/app");
      const { getFirestore } = await import("firebase-admin/firestore");
      const app =
        getApps()[0] ||
        initializeApp(
          process.env.FIRESTORE_EMULATOR_HOST
            ? { projectId: "imtwebsite-ddf59" }
            : { credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) }
        );
      return getFirestore(app);
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
};

export const cleanGreetingPatch = (patch) => {
  const out = {};
  for (const [k, type] of Object.entries(GREETING_FIELDS)) {
    if (patch?.[k] === undefined) continue;
    if (typeof patch[k] !== type) throw new HttpError(400, `Field ${k} harus ${type}.`);
    out[k] = type === "string" ? patch[k].trim().slice(0, 500) : patch[k];
  }
  if (out.guestGender && !GENDERS.includes(out.guestGender)) {
    throw new HttpError(400, "guestGender harus Bapak, Ibu, atau Bapak/Ibu.");
  }
  if (!Object.keys(out).length) throw new HttpError(400, "Tidak ada field greeting yang diubah.");
  return out;
};

export const readGreeting = async () => {
  const snap = await (await firestore()).collection("settings").doc("greeting").get();
  return snap.exists ? snap.data() : {};
};

export const writeGreeting = async (patch) => {
  const clean = cleanGreetingPatch(patch);
  await (await firestore()).collection("settings").doc("greeting").set(clean, { merge: true });
  return clean;
};
