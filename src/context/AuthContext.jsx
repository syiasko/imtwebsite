import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  browserSessionPersistence,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword,
} from "firebase/auth";
import { auth, staffEmail } from "../firebase/config";
import { subscribeUserProfile } from "../firebase/api";

const AuthContext = createContext(null);

// Firebase error codes → messages for the login and password forms.
export const authErrorMessage = (err) => {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Username atau password salah.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan gagal. Tunggu beberapa menit lalu coba lagi.";
    case "auth/network-request-failed":
      return "Tidak ada koneksi ke server. Periksa internet lalu coba lagi.";
    case "auth/operation-not-allowed":
      return "Login username/password belum diaktifkan di Firebase Console (Authentication, Sign-in method, Email/Password).";
    case "auth/weak-password":
      return "Password minimal 6 karakter.";
    case "auth/email-already-in-use":
      return "Username ini sudah terdaftar di Firebase Auth. Pakai username lain, atau hapus akun lamanya di Firebase Console.";
    case "auth/requires-recent-login":
      return "Sesi sudah lama. Logout lalu login lagi sebelum mengganti password.";
    default:
      return err?.message || "Terjadi kesalahan.";
  }
};

// status: "loading" | "signedOut" | "signedIn" | "noAccess"
// A signed-in Firebase user only gets into the panel when users/{uid} exists
// with a known role; Firestore rules enforce the same check server-side.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        // Older builds signed every visitor in anonymously; drop those sessions.
        if (u?.isAnonymous) {
          fbSignOut(auth);
          return;
        }
        setProfile(undefined);
        setUser(u);
      }),
    []
  );

  useEffect(() => {
    if (!user) return undefined;
    return subscribeUserProfile(
      user.uid,
      (p) => setProfile(p),
      () => setProfile(null)
    );
  }, [user]);

  const role = profile?.role;
  const hasRole = role === "admin" || role === "editor";
  const status =
    user === undefined || (user && profile === undefined)
      ? "loading"
      : !user
        ? "signedOut"
        : hasRole
          ? "signedIn"
          : "noAccess";

  const signIn = useCallback(async (username, password) => {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, staffEmail(username), password);
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const u = auth.currentUser;
    if (!u) throw new Error("Belum login.");
    await reauthenticateWithCredential(
      u,
      EmailAuthProvider.credential(u.email, currentPassword)
    );
    await updatePassword(u, newPassword);
  }, []);

  const value = useMemo(
    () => ({
      status,
      uid: user?.uid || null,
      username: profile?.username || "",
      role: hasRole ? role : null,
      isStaff: status === "signedIn",
      isAdmin: status === "signedIn" && role === "admin",
      signIn,
      signOut,
      changePassword,
    }),
    [status, user, profile, role, hasRole, signIn, signOut, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
