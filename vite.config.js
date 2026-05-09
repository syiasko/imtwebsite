import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Signage app — runs on TVs / kiosk devices, full-screen.
// Built and deployed independently of imtwebsite (root).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "firebase-vendor": ["firebase/app", "firebase/firestore", "firebase/auth"],
        },
      },
    },
  },
});
