import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Same Firebase project as imtwebsite — signage reads from the same
// categories / vehicles / settings docs the admin already manages.
const firebaseConfig = {
  apiKey: "AIzaSyDdki2bvmzBwhVL3vW4OOmw9X7ScuLbwHo",
  authDomain: "imtwebsite-ddf59.firebaseapp.com",
  projectId: "imtwebsite-ddf59",
  storageBucket: "imtwebsite-ddf59.firebasestorage.app",
  messagingSenderId: "222868474268",
  appId: "1:222868474268:web:1bdef174bc2c461e5e2059",
  measurementId: "G-22ZZZ5PFEJ",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let authPromise = null;
export const ensureAnonAuth = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((cred) => cred.user)
      .catch((err) => {
        authPromise = null;
        throw err;
      });
  }
  return authPromise;
};
