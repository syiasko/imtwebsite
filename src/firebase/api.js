import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

const CATEGORIES = "categories";
const VEHICLES = "vehicles";
const SETTINGS = "settings";
const USERS = "users";
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

export const findUserByUsername = async (username) => {
  const q = query(
    collection(db, USERS),
    where("username", "==", username.toLowerCase())
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? { id: first.id, ...first.data() } : null;
};

export const usersExist = async () => {
  const snap = await getDocs(collection(db, USERS));
  return !snap.empty;
};

// --- Contact messages ----------------------------------------------------
export const saveContactMessage = (message) => {
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return setDoc(doc(db, "messages", id), {
    id,
    ...stripUndefined(message),
    createdAt: new Date().toISOString(),
  });
};

// --- Initial seed --------------------------------------------------------
export const seedIfEmpty = async ({ categories, vehicles, company }) => {
  const companySnap = await getDoc(doc(db, SETTINGS, COMPANY_DOC));
  if (companySnap.exists()) return false;

  const batch = writeBatch(db);
  categories.forEach((c) => batch.set(doc(db, CATEGORIES, c.id), c));
  vehicles.forEach((v) => batch.set(doc(db, VEHICLES, v.id), v));
  batch.set(doc(db, SETTINGS, COMPANY_DOC), company);
  await batch.commit();
  return true;
};
