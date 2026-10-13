import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const ISOLATION = { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless" };

// The site lives at https://bettter.github.io/master-duel-ai-advisor/.
export default defineConfig({
  root: __dirname,
  base: "/master-duel-ai-advisor/",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
  worker: { format: "es" },
  // Cross-origin isolation in development and preview, so SharedArrayBuffer works without the service worker.
  server: { headers: ISOLATION },
  preview: { headers: ISOLATION },
});
