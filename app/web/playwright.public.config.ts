import { defineConfig, devices } from "@playwright/test";

// Verificação da versão web PUBLICADA (GitHub Pages): sem servidor local.
// Uso: PUBLIC_URL=https://vitormazziero.github.io/enzitag-optima/ EXPECTED_VERSION=0.2.0 \
//      E2E_BROWSERS=chromium,firefox,chrome,msedge npx playwright test -c playwright.public.config.ts
const browsers = (process.env.E2E_BROWSERS ?? "chromium").split(",");
const projectFor: Record<string, object> = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  chrome: { ...devices["Desktop Chrome"], channel: "chrome" },
  msedge: { ...devices["Desktop Edge"], channel: "msedge" },
};

export default defineConfig({
  testDir: "tests/public",
  timeout: 60_000,
  reporter: [["list"]],
  use: { baseURL: process.env.PUBLIC_URL ?? "https://vitormazziero.github.io/enzitag-optima/" },
  projects: browsers.map((name) => ({ name, use: projectFor[name] ?? devices["Desktop Chrome"] })),
});
