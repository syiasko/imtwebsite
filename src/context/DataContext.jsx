import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  initialCategories,
  initialVehicles,
  initialCompanySettings,
} from "../data/initialData";
import {
  deleteCategoryDoc,
  deleteVehicleDoc,
  saveCategory,
  saveCompany,
  saveVehicle,
  seedIfEmpty,
  subscribeCategories,
  subscribeCompany,
  subscribeVehicles,
} from "../firebase/api";
import { ensureAnonAuth } from "../firebase/config";

const DataContext = createContext(null);

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [company, setCompany] = useState(initialCompanySettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seedRef = useRef(false);

  useEffect(() => {
    let unsubCats = () => {};
    let unsubVeh = () => {};
    let unsubCompany = () => {};
    let cancelled = false;

    (async () => {
      try {
        await ensureAnonAuth();
        if (!seedRef.current) {
          seedRef.current = true;
          await seedIfEmpty({
            categories: initialCategories,
            vehicles: initialVehicles,
            company: initialCompanySettings,
          }).catch((err) => {
            // If seeding fails (e.g. rules), keep defaults so UI still renders.
            console.warn("Firestore seed skipped:", err?.message || err);
          });
        }

        if (cancelled) return;

        unsubCats = subscribeCategories((rows) => setCategories(rows));
        unsubVeh = subscribeVehicles((rows) => setVehicles(rows));
        unsubCompany = subscribeCompany((data) => {
          setCompany((prev) => ({ ...initialCompanySettings, ...(data || prev) }));
          setLoading(false);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubCats();
      unsubVeh();
      unsubCompany();
    };
  }, []);

  const upsertCategory = useCallback(async (category) => {
    const slug = slugify(category.slug || category.name);
    const id = category.id || slug || `cat-${Date.now()}`;
    const next = {
      id,
      name: category.name.trim(),
      slug,
      description: category.description?.trim() || "",
      icon: category.icon || "tag",
    };
    await saveCategory(next);
  }, []);

  const deleteCategory = useCallback((id) => deleteCategoryDoc(id), []);

  const upsertVehicle = useCallback(async (vehicle) => {
    const id = vehicle.id || `v-${Date.now()}`;
    const next = {
      id,
      name: vehicle.name.trim(),
      categoryId: vehicle.categoryId,
      tagline: vehicle.tagline?.trim() || "",
      description: vehicle.description?.trim() || "",
      images:
        Array.isArray(vehicle.images) && vehicle.images.length > 0
          ? vehicle.images
          : [],
      specs: vehicle.specs || {},
      features: Array.isArray(vehicle.features) ? vehicle.features : [],
    };
    await saveVehicle(next);
  }, []);

  const deleteVehicle = useCallback((id) => deleteVehicleDoc(id), []);

  const updateCompany = useCallback(
    (patch) => saveCompany({ ...company, ...patch }),
    [company]
  );

  const resetData = useCallback(async () => {
    // Re-write seed values; existing docs with same id are overwritten, but
    // user-added docs are preserved (caller can also delete via admin UI).
    for (const c of initialCategories) await saveCategory(c);
    for (const v of initialVehicles) await saveVehicle(v);
    await saveCompany(initialCompanySettings);
  }, []);

  const value = useMemo(
    () => ({
      categories,
      vehicles,
      company,
      loading,
      error,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      resetData,
    }),
    [
      categories,
      vehicles,
      company,
      loading,
      error,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      resetData,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
