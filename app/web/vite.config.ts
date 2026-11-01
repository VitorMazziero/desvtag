/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base relativo: funciona em /, em /enzitag-optima/ (GitHub Pages) e no Tauri.
export default defineConfig({
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  build: { target: "es2022", sourcemap: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
