import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
} from "firebase/auth";
import {
  AUTH_EMULATOR_URL,
  USE_EMULATORS,
  db,
  firebaseConfig,
  staffEmail,
} from "./config.js";

const CATEGORIES = "categories";
const VEHICLES = "vehicles";
const SETTINGS = "settings";
const USERS = "users";
const CONTACT_MESSAGES = "contact_messages";
const COMPANY_DOC = "company";

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const wrapErr = (fn) => (cb, onError) =>
  fn(
    (snap) => cb(snap),
    (err) => onError?.(err)
  );

// --- Categories ----------------------------------------------------------
export const subscribeCategories = (cb, onError) =>
  onSnapshot(
    collection(db, CATEGORIES),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );

export const saveCategory = (category) =>
  setDoc(doc(db, CATEGORIES, category.id), stripUndefined(category));

export const deleteCategoryDoc = async (id) => {
  const vehicleSnap = await getDocs(collection(db, VEHICLES));
  const batch = writeBatch(db);
  vehicleSnap.forEach((d) => {
    if (d.data().categoryId === id) batch.delete(d.ref);
  });
  batch.delete(doc(db, CATEGORIES, id));
  await batch.commit();
};

// --- Vehicles ------------------------------------------------------------
export const subscribeVehicles = (cb, onError) =>
  onSnapshot(
    collection(db, VEHICLES),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );

export const saveVehicle = (vehicle) =>
  setDoc(doc(db, VEHICLES, vehicle.id), stripUndefined(vehicle));

export const deleteVehicleDoc = (id) => deleteDoc(doc(db, VEHICLES, id));

// --- Company settings ----------------------------------------------------
export const subscribeCompany = (cb, onError) =>
  onSnapshot(
    doc(db, SETTINGS, COMPANY_DOC),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );

export const saveCompany = (company) =>
  setDoc(doc(db, SETTINGS, COMPANY_DOC), stripUndefined(company), {
    merge: true,
  });

// --- Greeting settings ---------------------------------------------------
const GREETING_DOC = "greeting";

export const subscribeGreeting = (cb, onError) =>
  onSnapshot(
    doc(db, SETTINGS, GREETING_DOC),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (err) => onError?.(err)
  );

export const saveGreeting = (greeting) =>
  setDoc(doc(db, SETTINGS, GREETING_DOC), stripUndefined(greeting), {
    merge: true,
  });

// --- Users ---------------------------------------------------------------
export const subscribeUsers = (cb, onError) =>
  onSnapshot(
    collection(db, USERS),
    (snap) =>
      cb(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) =>
          (a.username || "").localeCompare(b.username || "")
        )
      ),
    (err) => onError?.(err)
  );

export const saveUser = (user) =>
  setDoc(doc(db, USERS, user.id), stripUndefined(user));

export const deleteUserDoc = (id) => deleteDoc(doc(db, USERS, id));

export const subscribeUserProfile = (uid, cb, onError) =>
  onSnapshot(
    doc(db, USERS, uid),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => onError?.(err)
  );

// Creating an account with the client SDK signs in as that account, so it is
// done on a separate app instance to keep the current admin logged in.
let provisioningAuth = null;
export const createStaffAccount = async (username, password) => {
  if (!provisioningAuth) {
    provisioningAuth = getAuth(initializeApp(firebaseConfig, "staff-provisioning"));
    if (USE_EMULATORS) {
      connectAuthEmulator(provisioningAuth, AUTH_EMULATOR_URL, {
        disableWarnings: true,
      });
    }
    await setPersistence(provisioningAuth, inMemoryPersistence);
  }
  const cred = await createUserWithEmailAndPassword(
    provisioningAuth,
    staffEmail(username),
    password
  );
  await signOut(provisioningAuth);
  return cred.user.uid;
};

// --- Contact messages ----------------------------------------------------
export const STATUS_NEW = "New";
export const STATUS_READ = "Read";
export const STATUS_REPLIED = "Replied";

export const saveContactMessage = async (message) => {
  const ref = await addDoc(collection(db, CONTACT_MESSAGES), {
    ...stripUndefined(message),
    status: STATUS_NEW,
    created_at: serverTimestamp(),
  });
  return ref.id;
};

export const subscribeContactMessages = (cb, onError) => {
  // orderBy created_at desc so newest shows first; if a doc lacks the field
  // (legacy import) Firestore drops it from results — we tolerate that.
  const q = query(
    collection(db, CONTACT_MESSAGES),
    orderBy("created_at", "desc")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
};

export const updateContactMessageStatus = (id, status) =>
  updateDoc(doc(db, CONTACT_MESSAGES, id), {
    status,
    updated_at: serverTimestamp(),
  });

export const deleteContactMessage = (id) =>
  deleteDoc(doc(db, CONTACT_MESSAGES, id));

// --- AI access tokens (hosted MCP endpoint) ------------------------------
const AI_TOKENS = "ai_tokens";

// Admins see every token; other staff only their own (the rules require the
// uid filter for them).
export const subscribeAiTokens = (uid, cb, onError) =>
  onSnapshot(
    uid
      ? query(collection(db, AI_TOKENS), where("uid", "==", uid))
      : collection(db, AI_TOKENS),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );

export const createAiTokenDoc = (id, data) => setDoc(doc(db, AI_TOKENS, id), data);

export const deleteAiTokenDoc = (id) => deleteDoc(doc(db, AI_TOKENS, id));
