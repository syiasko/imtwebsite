#!/usr/bin/env node
// Local (stdio) MCP server for managing the IMT website content from an AI
// agent session (Claude Code, Codex, ...). It logs in as a normal admin-panel
// user through Firebase Auth, so Firestore rules and the user's role apply
// exactly as in the /dapurnyaimt panel. For the hosted variant that agents
// reach with a token from the panel's Akses AI page, see api/mcp.js.
//
// Credentials come from the environment, never from this repo:
//   IMT_ADMIN_USERNAME, IMT_ADMIN_PASSWORD
// Set VITE_FIREBASE_EMULATORS=1 to work against local emulators instead.
//
// stdout carries the MCP protocol; log only to stderr.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  USE_EMULATORS,
  auth,
  db,
  firebaseConfig,
  staffEmail,
} from "../src/firebase/config.js";
import {
  createStaffAccount,
  deleteCategoryDoc,
  updateContactMessageStatus,
} from "../src/firebase/api.js";
import { SERVER_INFO, SERVER_INSTRUCTIONS, registerTools } from "./tools.mjs";

const store = {
  list: async (name) =>
    (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() })),
  get: async (name, id) => {
    const snap = await getDoc(doc(db, name, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  set: (name, id, data) => setDoc(doc(db, name, id), data),
  merge: (name, id, data) => setDoc(doc(db, name, id), data, { merge: true }),
  remove: (name, id) => deleteDoc(doc(db, name, id)),
  deleteCategory: deleteCategoryDoc,
  setMessageStatus: updateContactMessageStatus,
  createAuthUser: createStaffAccount,
};

let sessionPromise = null;
const session = () => {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const username = process.env.IMT_ADMIN_USERNAME?.trim().toLowerCase();
      const password = process.env.IMT_ADMIN_PASSWORD;
      if (!username || !password) {
        throw new Error(
          "IMT_ADMIN_USERNAME dan IMT_ADMIN_PASSWORD belum di-set di environment MCP server."
        );
      }
      try {
        const cred = await signInWithEmailAndPassword(auth, staffEmail(username), password);
        const profile = await store.get("users", cred.user.uid);
        if (profile?.role !== "admin" && profile?.role !== "editor") {
          throw new Error(`Akun "${username}" tidak punya akses ke panel admin.`);
        }
        return { uid: cred.user.uid, username, role: profile.role };
      } catch (err) {
        if (/invalid-credential|wrong-password|user-not-found/.test(err?.code || "")) {
          throw new Error("Login gagal: username atau password salah.");
        }
        throw err;
      }
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
};

const server = new McpServer(SERVER_INFO, { instructions: SERVER_INSTRUCTIONS });
registerTools(server, {
  store,
  session,
  siteUrl: process.env.IMT_SITE_URL,
  localFiles: true,
  environment: { project: firebaseConfig.projectId, emulator: USE_EMULATORS, transport: "stdio" },
});

await server.connect(new StdioServerTransport());
console.error(
  `imt-admin MCP server ready (${USE_EMULATORS ? "emulator" : firebaseConfig.projectId})`
);
