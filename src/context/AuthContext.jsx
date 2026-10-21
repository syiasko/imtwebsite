import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile } from "../lib/api";
import { staffEmail } from "../lib/staff";

const AuthContext = createContext(null);

// Supabase auth errors → messages for the login and password forms.
export const authErrorMessage = (err) => {
  const code = err?.code || "";
  const msg = err?.message || "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
    return "Username atau password salah.";
  }
  if (code === "over_request_rate_limit" || err?.status === 429) {
    return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  }
  if (code === "weak_password") return "Password minimal 6 karakter.";
  if (code === "same_password") return "Password baru sama dengan password lama.";
  if (/fetch|network/i.test(msg)) {
    return "Tidak ada koneksi ke server. Periksa internet lalu coba lagi.";
  }
  return msg || "Terjadi kesalahan.";
};

// status: "loading" | "signedOut" | "signedIn" | "noAccess"
// A signed-in user only gets into the panel when profiles has a row with a
// known role; the database policies enforce the same check server-side.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id || null;

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;
    setProfile(undefined);
    const load = () =>
      fetchProfile(uid)
        .then((p) => !cancelled && setProfile(p))
        .catch(() => !cancelled && setProfile(null));
    load();
    // Role changes or removal by an admin apply without a reload.
    const channel = supabase
      .channel(`profile-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        load
      )
      .subscribe();
    const poll = setInterval(load, 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [uid]);

  const role = profile?.role;
  const hasRole = role === "admin" || role === "editor";
  const status =
    session === undefined || (uid && profile === undefined)
      ? "loading"
      : !uid
        ? "signedOut"
        : hasRole
          ? "signedIn"
          : "noAccess";

  const signIn = useCallback(async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: staffEmail(username),
      password,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const email = session?.user?.email;
      if (!email) throw new Error("Belum login.");
      const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (check.error) {
        throw Object.assign(new Error("Password lama salah."), { code: "wrong_current_password" });
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    [session]
  );

  const value = useMemo(
    () => ({
      status,
      uid,
      username: profile?.username || "",
      role: hasRole ? role : null,
      isStaff: status === "signedIn",
      isAdmin: status === "signedIn" && role === "admin",
      signIn,
      signOut,
      changePassword,
    }),
    [status, uid, profile, role, hasRole, signIn, signOut, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
