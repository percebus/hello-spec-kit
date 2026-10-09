import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev-only server for the Playwright component gallery (Next.js cannot serve it).
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
