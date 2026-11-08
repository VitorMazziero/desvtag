/// <reference types="vitest/config" />

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base relativo: funciona em /, em /enzitag-optima/ (GitHub Pages) e no Tauri.
const commit = (() => {
  try {
    const hash = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
    }).trim();
    try {
      execFileSync("git", ["diff", "--quiet"], { stdio: "ignore" });
      return hash;
    } catch {
      return `${hash}+dirty`;
    }
  } catch {
    return "unknown";
  }
})();
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version,
    ),
    __BUILD_COMMIT__: JSON.stringify(process.env.BUILD_COMMIT ?? commit),
  },
  base: "./",
  plugins: [react()],
  worker: { format: "es" },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        picker: fileURLToPath(new URL("./drive-picker.html", import.meta.url)),
      },
    },
  },
  test: {
    environment: "jsdom",
    maxWorkers: 4,
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
