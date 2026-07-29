import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// base "./" -> relative asset paths so the built site runs from any subpath
// (GitHub Pages project path, cPanel subfolder, local file, Vercel root).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  server: { port: 4318 },
});
