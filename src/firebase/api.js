import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";

const CATEGORIES = "categories";
const VEHICLES = "vehicles";
const SETTINGS = "settings";
const COMPANY_DOC = "company";

const stripUndefined = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );

// --- Categories ----------------------------------------------------------
export const subscribeCategories = (cb) =>
  onSnapshot(collection(db, CATEGORIES), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });

export const saveCategory = (category) =>
  setDoc(doc(db, CATEGORIES, category.id), stripUndefined(category));

export const deleteCategoryDoc = async (id) => {
  // Cascade: remove vehicles that reference this category.
  const vehicleSnap = await getDocs(collection(db, VEHICLES));
  const batch = writeBatch(db);
  vehicleSnap.forEach((d) => {
    if (d.data().categoryId === id) batch.delete(d.ref);
  });
  batch.delete(doc(db, CATEGORIES, id));
  await batch.commit();
};

// --- Vehicles ------------------------------------------------------------
export const subscribeVehicles = (cb) =>
  onSnapshot(collection(db, VEHICLES), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });

export const saveVehicle = (vehicle) =>
  setDoc(doc(db, VEHICLES, vehicle.id), stripUndefined(vehicle));

export const deleteVehicleDoc = (id) => deleteDoc(doc(db, VEHICLES, id));

// --- Company settings ----------------------------------------------------
export const subscribeCompany = (cb) =>
  onSnapshot(doc(db, SETTINGS, COMPANY_DOC), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });

export const saveCompany = (company) =>
  setDoc(doc(db, SETTINGS, COMPANY_DOC), stripUndefined(company), {
    merge: true,
  });

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
