import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { initialCategories, initialVehicles } from "../data/initialData";

const STORAGE_KEY = "imt-karoseri-data-v1";

const DataContext = createContext(null);

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const loadFromStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.categories || !parsed.vehicles) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveToStorage = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignored — quota exceeded just means newest image was too large.
  }
};

export function DataProvider({ children }) {
  const [state, setState] = useState(() => {
    const stored = loadFromStorage();
    return (
      stored ?? { categories: initialCategories, vehicles: initialVehicles }
    );
  });

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const resetData = useCallback(() => {
    setState({ categories: initialCategories, vehicles: initialVehicles });
  }, []);

  const upsertCategory = useCallback((category) => {
    setState((prev) => {
      const slug = slugify(category.slug || category.name);
      const id = category.id || slug || `cat-${Date.now()}`;
      const next = {
        id,
        name: category.name.trim(),
        slug,
        description: category.description?.trim() || "",
        icon: category.icon || "tag",
      };
      const exists = prev.categories.some((c) => c.id === id);
      const categories = exists
        ? prev.categories.map((c) => (c.id === id ? next : c))
        : [...prev.categories, next];
      return { ...prev, categories };
    });
  }, []);

  const deleteCategory = useCallback((id) => {
    setState((prev) => ({
      categories: prev.categories.filter((c) => c.id !== id),
      vehicles: prev.vehicles.filter((v) => v.categoryId !== id),
    }));
  }, []);

  const upsertVehicle = useCallback((vehicle) => {
    setState((prev) => {
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
      const exists = prev.vehicles.some((v) => v.id === id);
      const vehicles = exists
        ? prev.vehicles.map((v) => (v.id === id ? next : v))
        : [...prev.vehicles, next];
      return { ...prev, vehicles };
    });
  }, []);

  const deleteVehicle = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((v) => v.id !== id),
    }));
  }, []);

  const value = useMemo(
    () => ({
      categories: state.categories,
      vehicles: state.vehicles,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      resetData,
    }),
    [
      state,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
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
