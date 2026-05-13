import { collection, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db, ensureAnonAuth } from "./config";

const FALLBACK_COMPANY = {
  name: "PT. INDRAPRASTA MULIA TEKNIK",
  shortName: "IMT Karoseri",
  tagline: "Spesialis Karoseri Kendaraan Khusus & Custom Built Indonesia",
  phone: "+6281322315332",
  email: "rtnayulstr@gmail.com",
  address: "Kp. Babakan Rawahaur No. 100, Babakan Madang, Sentul, Jawa Barat 16810",
  websiteUrl: "https://imtindonesia.com",
};

// Subscribes to the same Firestore collections imtwebsite uses, exposed as a
// single hook so the signage UI just consumes ready-to-render data.
export function useSignageData() {
  const [state, setState] = useState({
    categories: [],
    vehicles: [],
    company: FALLBACK_COMPANY,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let unsubCats = () => {};
    let unsubVeh = () => {};
    let unsubCompany = () => {};
    let cancelled = false;

    (async () => {
      try {
        await ensureAnonAuth();
        if (cancelled) return;

        unsubCats = onSnapshot(
          collection(db, "categories"),
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setState((prev) => ({ ...prev, categories: rows, loading: false }));
          },
          (err) => setState((prev) => ({ ...prev, error: err, loading: false }))
        );

        unsubVeh = onSnapshot(
          collection(db, "vehicles"),
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setState((prev) => ({ ...prev, vehicles: rows, loading: false }));
          },
          (err) => setState((prev) => ({ ...prev, error: err, loading: false }))
        );

        unsubCompany = onSnapshot(
          doc(db, "settings", "company"),
          (snap) => {
            if (snap.exists()) {
              setState((prev) => ({
                ...prev,
                company: { ...FALLBACK_COMPANY, ...snap.data() },
              }));
            }
          },
          () => {
            // Settings doc missing → keep fallback. Not fatal.
          }
        );
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, error: err, loading: false }));
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

  // Group vehicles by category for fast list rendering. Only returns
  // categories that actually have vehicles attached.
  const grouped = useMemo(() => {
    const byCategory = new Map();
    state.categories.forEach((c) => byCategory.set(c.id, { category: c, items: [] }));
    state.vehicles.forEach((v) => {
      const slot = byCategory.get(v.categoryId);
      if (slot) slot.items.push(v);
    });
    return Array.from(byCategory.values()).filter((g) => g.items.length > 0);
  }, [state.categories, state.vehicles]);

  return { ...state, grouped };
}
