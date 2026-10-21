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
  initialCompanySettings,
  DEFAULT_MAPS_PLACE_QUERY,
  buildMapsEmbedUrl,
} from "../data/initialData";
import * as api from "../lib/api";
import { slugify } from "../utils/slug";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

// Existing company settings from the original seed have a mapsEmbedUrl built
// from the raw address string, which Google Maps renders without the proper
// Place pin; swap it for the place-name default at read time.
const normalizeCompany = (data) => {
  const merged = { ...initialCompanySettings, ...(data || {}) };
  const legacyAddressEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(
    initialCompanySettings.address
  )}&output=embed`;
  if (merged.mapsEmbedUrl === legacyAddressEmbed && DEFAULT_MAPS_PLACE_QUERY) {
    merged.mapsEmbedUrl = buildMapsEmbedUrl(DEFAULT_MAPS_PLACE_QUERY);
  }
  return merged;
};

export function DataProvider({ children }) {
  const { isStaff, isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [company, setCompany] = useState(initialCompanySettings);
  const [greeting, setGreeting] = useState({
    isActive: true,
    text: "Selamat Datang di IMT Karoseri, Mitra Terpercaya Kendaraan Khusus Indonesia",
    guestGender: "Bapak/Ibu",
    guestName: "",
    guestTitle: "",
    guestCompany: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const vehiclesRef = useRef([]);
  vehiclesRef.current = vehicles;

  const reload = useMemo(
    () => ({
      categories: () => api.fetchCategories().then(setCategories),
      vehicles: () => api.fetchVehicles().then(setVehicles),
      company: () => api.fetchCompany().then((d) => setCompany(normalizeCompany(d))),
      messages: () => api.fetchMessages().then(setMessages),
      users: () => api.fetchProfiles().then(setUsers),
    }),
    []
  );

  // Public catalog: one query per table, then served from memory.
  useEffect(() => {
    Promise.all([reload.categories(), reload.vehicles(), reload.company()])
      .then(() => setLoadError(null))
      .catch((err) => {
        console.error("Gagal memuat data:", err);
        setLoadError(err);
      })
      .finally(() => setLoading(false));
  }, [reload]);

  // The greeting stays in Firestore because the signage TV reads it there.
  useEffect(
    () =>
      api.subscribeGreeting(
        (data) => data && setGreeting((prev) => ({ ...prev, ...data })),
        (err) => console.error("Greeting subscription error:", err)
      ),
    []
  );

  // Staff see live changes (other admins, AI agents) without reloading.
  useEffect(() => {
    if (!isStaff) {
      setMessages([]);
      return undefined;
    }
    reload.messages().catch((err) => console.error("Pesan gagal dimuat:", err));
    const byTable = {
      categories: reload.categories,
      vehicles: reload.vehicles,
      contact_messages: reload.messages,
    };
    return api.subscribeChanges(Object.keys(byTable), (table) =>
      byTable[table]().catch((err) => console.error(`Reload ${table} gagal:`, err))
    );
  }, [isStaff, reload]);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }
    reload.users().catch((err) => console.error("Pengguna gagal dimuat:", err));
  }, [isAdmin, reload]);

  // --- Categories
  const upsertCategory = useCallback(
    async (category) => {
      const slug = slugify(category.slug || category.name);
      await api.saveCategory({
        id: category.id || slug || `cat-${Date.now()}`,
        name: category.name.trim(),
        slug,
        description: category.description?.trim() || "",
        icon: category.icon || "tag",
      });
      await reload.categories();
    },
    [reload]
  );
  const deleteCategory = useCallback(
    async (id) => {
      await api.deleteCategory(id);
      await Promise.all([reload.categories(), reload.vehicles()]);
    },
    [reload]
  );

  // --- Vehicles
  const upsertVehicle = useCallback(
    async (vehicle) => {
      const id = vehicle.id || `v-${Date.now()}`;
      const next = {
        id,
        slug: slugify(vehicle.slug || vehicle.name || id),
        name: vehicle.name.trim(),
        categoryId: vehicle.categoryId,
        tagline: vehicle.tagline?.trim() || "",
        description: vehicle.description?.trim() || "",
        youtubeUrl: vehicle.youtubeUrl?.trim() || "",
        images: Array.isArray(vehicle.images) ? vehicle.images : [],
        specs: vehicle.specs || {},
        features: Array.isArray(vehicle.features) ? vehicle.features : [],
      };
      const before = vehiclesRef.current.find((v) => v.id === id);
      await api.saveVehicle(next);
      // Photos removed in the form are deleted from storage once saved.
      const removed = (before?.images || []).filter((src) => !next.images.includes(src));
      if (removed.length) api.deleteMedia(removed).catch(() => {});
      await reload.vehicles();
      return next;
    },
    [reload]
  );
  const deleteVehicle = useCallback(
    async (vehicle) => {
      await api.deleteVehicle(vehicle);
      await reload.vehicles();
    },
    [reload]
  );

  // --- Company
  const updateCompany = useCallback(
    async (patch) => {
      await api.saveCompany(patch);
      await reload.company();
    },
    [reload]
  );

  // --- Greeting (written server-side to Firestore for the signage TV)
  const updateGreeting = useCallback((patch) => api.saveGreeting(patch), []);

  // --- Users (accounts are managed server-side, see api/admin-users.js)
  const upsertUser = useCallback(
    async ({ id, username, name, role, password }) => {
      const result = await api.adminUsers(
        id
          ? { action: "update", id, name, role }
          : { action: "create", username, name, role, password }
      );
      await reload.users();
      return result;
    },
    [reload]
  );
  const deleteUser = useCallback(
    async (id) => {
      await api.adminUsers({ action: "delete", id });
      await reload.users();
    },
    [reload]
  );
  const resetUserPassword = useCallback(
    (id, password) => api.adminUsers({ action: "reset-password", id, password }),
    []
  );

  // --- Contact messages
  const setMessageStatus = useCallback(
    async (id, status) => {
      await api.updateMessageStatus(id, status);
      await reload.messages();
    },
    [reload]
  );
  const deleteMessage = useCallback(
    async (id) => {
      await api.deleteMessage(id);
      await reload.messages();
    },
    [reload]
  );

  const value = useMemo(
    () => ({
      categories,
      vehicles,
      users,
      messages,
      company,
      greeting,
      loading,
      loadError,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      updateGreeting,
      upsertUser,
      deleteUser,
      resetUserPassword,
      setMessageStatus,
      deleteMessage,
    }),
    [
      categories,
      vehicles,
      users,
      messages,
      company,
      greeting,
      loading,
      loadError,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      updateGreeting,
      upsertUser,
      deleteUser,
      resetUserPassword,
      setMessageStatus,
      deleteMessage,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
