import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  initialCompanySettings,
  DEFAULT_MAPS_PLACE_QUERY,
  buildMapsEmbedUrl,
} from "../data/initialData";
import {
  createStaffAccount,
  deleteCategoryDoc,
  deleteContactMessage,
  deleteUserDoc,
  deleteVehicleDoc,
  saveCategory,
  saveCompany,
  saveGreeting,
  saveUser,
  saveVehicle,
  subscribeCategories,
  subscribeCompany,
  subscribeContactMessages,
  subscribeGreeting,
  subscribeUsers,
  subscribeVehicles,
  updateContactMessageStatus,
} from "../firebase/api";
import { slugify } from "../utils/slug";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

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
  const [firestoreError, setFirestoreError] = useState(null);

  // Public collections: readable by every visitor without signing in.
  useEffect(() => {
    const onSubError = (err) => {
      console.error("Firestore subscription error:", err);
      setFirestoreError(err);
      setLoading(false);
    };

    // Stay in the loading state until every collection the UI reads has
    // delivered its first snapshot; otherwise screens briefly show empty
    // lists or the default greeting status.
    const pending = new Set(["categories", "vehicles", "greeting", "company"]);
    const markReady = (key) => {
      if (pending.delete(key) && pending.size === 0) setLoading(false);
    };

    const unsubs = [
      subscribeCategories((rows) => {
        setCategories(rows);
        markReady("categories");
      }, onSubError),
      subscribeVehicles((rows) => {
        setVehicles(rows);
        markReady("vehicles");
      }, onSubError),
      subscribeGreeting((data) => {
        if (data) {
          setGreeting((prev) => ({ ...prev, ...data }));
        }
        markReady("greeting");
      }, onSubError),
      subscribeCompany((data) => {
        setCompany((prev) => {
          // passwordHash belongs to the old shared-password login; never keep it.
          const { passwordHash, ...merged } = {
            ...initialCompanySettings,
            ...(data || prev),
          };
          // Migration: existing Firestore docs from the original seed have a
          // mapsEmbedUrl built from the raw address string, which Google
          // Maps renders without the proper Place pin. If we detect that
          // legacy URL, swap it for the new place-name-based default at
          // read time so the public site is immediately correct, without
          // forcing the admin to re-save settings.
          const legacyAddressEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(
            initialCompanySettings.address
          )}&output=embed`;
          if (
            merged.mapsEmbedUrl === legacyAddressEmbed &&
            DEFAULT_MAPS_PLACE_QUERY
          ) {
            merged.mapsEmbedUrl = buildMapsEmbedUrl(DEFAULT_MAPS_PLACE_QUERY);
          }
          return merged;
        });
        markReady("company");
        setFirestoreError(null);
      }, onSubError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Staff-only collections; the rules deny these to everyone else.
  useEffect(() => {
    if (!isStaff) {
      setMessages([]);
      return undefined;
    }
    return subscribeContactMessages(
      (rows) => setMessages(rows),
      (err) => console.error("Contact messages subscription error:", err)
    );
  }, [isStaff]);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      return undefined;
    }
    return subscribeUsers(
      (rows) => setUsers(rows),
      (err) => console.error("Users subscription error:", err)
    );
  }, [isAdmin]);

  // --- Categories
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

  // --- Vehicles
  const upsertVehicle = useCallback(async (vehicle) => {
    const id = vehicle.id || `v-${Date.now()}`;
    const baseSlug = slugify(vehicle.slug || vehicle.name || id);
    const next = {
      id,
      slug: baseSlug,
      name: vehicle.name.trim(),
      categoryId: vehicle.categoryId,
      tagline: vehicle.tagline?.trim() || "",
      description: vehicle.description?.trim() || "",
      youtubeUrl: vehicle.youtubeUrl?.trim() || "",
      images:
        Array.isArray(vehicle.images) && vehicle.images.length > 0
          ? vehicle.images
          : [],
      specs: vehicle.specs || {},
      features: Array.isArray(vehicle.features) ? vehicle.features : [],
    };
    await saveVehicle(next);
    return next;
  }, []);
  const deleteVehicle = useCallback((id) => deleteVehicleDoc(id), []);

  // --- Company
  const updateCompany = useCallback(
    (patch) => saveCompany({ ...company, ...patch }),
    [company]
  );

  // --- Greeting
  const updateGreeting = useCallback(
    (patch) => saveGreeting({ ...greeting, ...patch }),
    [greeting]
  );

  // --- Users
  // Passwords live in Firebase Auth. A new user gets an Auth account plus a
  // users/{uid} profile; editing only changes name and role.
  const upsertUser = useCallback(
    async ({ id, username, name, role, password }) => {
      const cleanUsername = username?.trim().toLowerCase();
      if (!cleanUsername) throw new Error("Username wajib diisi.");
      const now = new Date().toISOString();
      const uid = id || (await createStaffAccount(cleanUsername, password));
      const next = {
        id: uid,
        username: cleanUsername,
        name: name?.trim() || cleanUsername,
        role: role === "editor" ? "editor" : "admin",
        updatedAt: now,
      };
      if (!id) next.createdAt = now;
      await saveUser(next);
      return next;
    },
    []
  );
  const deleteUser = useCallback((id) => deleteUserDoc(id), []);

  // --- Contact messages
  const setMessageStatus = useCallback(
    (id, status) => updateContactMessageStatus(id, status),
    []
  );
  const deleteMessage = useCallback(
    (id) => deleteContactMessage(id),
    []
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
      firestoreError,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      updateGreeting,
      upsertUser,
      deleteUser,
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
      firestoreError,
      upsertCategory,
      deleteCategory,
      upsertVehicle,
      deleteVehicle,
      updateCompany,
      updateGreeting,
      upsertUser,
      deleteUser,
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
