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
  DEFAULT_MAPS_PLACE_QUERY,
  buildMapsEmbedUrl,
} from "../data/initialData";
import {
  deleteCategoryDoc,
  deleteContactMessage,
  deleteUserDoc,
  deleteVehicleDoc,
  saveCategory,
  saveCompany,
  saveGreeting,
  saveUser,
  saveVehicle,
  seedIfEmpty,
  subscribeCategories,
  subscribeCompany,
  subscribeContactMessages,
  subscribeGreeting,
  subscribeUsers,
  subscribeVehicles,
  updateContactMessageStatus,
} from "../firebase/api";
import { ensureAnonAuth } from "../firebase/config";
import { sha256Hex } from "../firebase/password";
import { slugify } from "../utils/slug";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [company, setCompany] = useState(initialCompanySettings);
  const [greeting, setGreeting] = useState({
    isActive: true,
    text: "Selamat Datang di IMT Karoseri — Mitra Terpercaya Kendaraan Khusus Indonesia",
    guestGender: "Bapak/Ibu",
    guestName: "",
    guestTitle: "",
    guestCompany: "",
  });
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState("idle"); // idle | ok | error
  const [authError, setAuthError] = useState(null);
  const [firestoreError, setFirestoreError] = useState(null);
  const seedRef = useRef(false);

  useEffect(() => {
    let unsubCats = () => {};
    let unsubVeh = () => {};
    let unsubCompany = () => {};
    let unsubGreeting = () => {};
    let unsubUsers = () => {};
    let unsubMessages = () => {};
    let cancelled = false;

    (async () => {
      try {
        await ensureAnonAuth();
        if (cancelled) return;
        setAuthStatus("ok");
        setAuthError(null);

        if (!seedRef.current) {
          seedRef.current = true;
          await seedIfEmpty({
            categories: initialCategories,
            vehicles: initialVehicles,
            company: initialCompanySettings,
          }).catch((err) => {
            console.warn("Seed skipped:", err?.message || err);
          });
        }
      } catch (err) {
        if (!cancelled) {
          setAuthStatus("error");
          setAuthError(err);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;

      const onSubError = (err) => {
        console.error("Firestore subscription error:", err);
        setFirestoreError(err);
        setLoading(false);
      };

      unsubCats = subscribeCategories(
        (rows) => setCategories(rows),
        onSubError
      );
      unsubVeh = subscribeVehicles((rows) => setVehicles(rows), onSubError);
      unsubUsers = subscribeUsers((rows) => setUsers(rows), onSubError);
      unsubGreeting = subscribeGreeting((data) => {
        if (data) {
          setGreeting((prev) => ({ ...prev, ...data }));
        }
      }, onSubError);
      unsubMessages = subscribeContactMessages(
        (rows) => setMessages(rows),
        // Don't surface errors here — anonymous visitors can hit a permission
        // denied if the rules don't allow read; that's fine, we just won't
        // populate the admin list for them.
        () => {}
      );
      unsubCompany = subscribeCompany((data) => {
        setCompany((prev) => {
          const merged = { ...initialCompanySettings, ...(data || prev) };
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
        setLoading(false);
        setFirestoreError(null);
      }, onSubError);
    })();

    return () => {
      cancelled = true;
      unsubCats();
      unsubVeh();
      unsubCompany();
      unsubGreeting();
      unsubUsers();
      unsubMessages();
    };
  }, []);

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
  const upsertUser = useCallback(
    async ({ id, username, name, role, password, passwordHash }) => {
      const cleanUsername = username?.trim().toLowerCase();
      if (!cleanUsername) throw new Error("Username wajib diisi.");
      const finalId = id || `u-${Date.now()}`;
      const next = {
        id: finalId,
        username: cleanUsername,
        name: name?.trim() || cleanUsername,
        role: role || "admin",
        passwordHash:
          password && password.length > 0
            ? await sha256Hex(password)
            : passwordHash || "",
        updatedAt: new Date().toISOString(),
      };
      if (!id) next.createdAt = next.updatedAt;
      if (!next.passwordHash && !id)
        throw new Error("Password wajib untuk user baru.");
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

  // --- Reset
  const resetData = useCallback(async () => {
    for (const c of initialCategories) await saveCategory(c);
    for (const v of initialVehicles) await saveVehicle(v);
    await saveCompany(initialCompanySettings);
  }, []);

  const value = useMemo(
    () => ({
      categories,
      vehicles,
      users,
      messages,
      company,
      greeting,
      loading,
      authStatus,
      authError,
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
      resetData,
    }),
    [
      categories,
      vehicles,
      users,
      messages,
      company,
      greeting,
      loading,
      authStatus,
      authError,
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
