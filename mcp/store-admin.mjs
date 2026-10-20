// Firestore/Auth backend for the hosted MCP endpoint, on the Admin SDK.
// Needs FIREBASE_SERVICE_ACCOUNT (the service-account key JSON) in production;
// against emulators (FIRESTORE_EMULATOR_HOST set) no credential is needed.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { firebaseConfig, staffEmail } from "../src/firebase/config.js";

const app =
  getApps()[0] ||
  initializeApp(
    process.env.FIRESTORE_EMULATOR_HOST
      ? { projectId: firebaseConfig.projectId }
      : {
          projectId: firebaseConfig.projectId,
          credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}")),
        }
  );

export const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export const adminStore = {
  list: async (name) =>
    (await adminDb.collection(name).get()).docs.map((d) => ({ id: d.id, ...d.data() })),
  get: async (name, id) => {
    const snap = await adminDb.collection(name).doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },
  set: (name, id, data) => adminDb.collection(name).doc(id).set(data),
  merge: (name, id, data) => adminDb.collection(name).doc(id).set(data, { merge: true }),
  remove: (name, id) => adminDb.collection(name).doc(id).delete(),
  deleteCategory: async (id) => {
    const units = await adminDb.collection("vehicles").where("categoryId", "==", id).get();
    const batch = adminDb.batch();
    units.forEach((d) => batch.delete(d.ref));
    batch.delete(adminDb.collection("categories").doc(id));
    await batch.commit();
  },
  setMessageStatus: (id, status) =>
    adminDb.collection("contact_messages").doc(id).update({
      status,
      updated_at: FieldValue.serverTimestamp(),
    }),
  createAuthUser: async (username, password) =>
    (await adminAuth.createUser({ email: staffEmail(username), password })).uid,
};
