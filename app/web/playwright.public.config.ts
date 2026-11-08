import { defineConfig, devices } from "@playwright/test";

// Verificação da versão publicada e do mesmo percurso no preview da CI.
// Uso: PUBLIC_URL=https://vitormazziero.github.io/desvtag/ EXPECTED_VERSION=0.4.0 \
//      E2E_BROWSERS=chromium,firefox,chrome,msedge npx playwright test -c playwright.public.config.ts
const browsers = (process.env.E2E_BROWSERS ?? "chromium").split(",");
const previewUrl = "http://127.0.0.1:4173/";
const baseURL = process.env.PUBLIC_URL ?? "https://vitormazziero.github.io/desvtag/";
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
  use: { baseURL },
  webServer:
    baseURL === previewUrl
      ? {
          command: "npm run preview -- --host 127.0.0.1",
          url: previewUrl,
          reuseExistingServer: !process.env.CI,
        }
      : undefined,
  projects: browsers.map((name) => ({ name, use: projectFor[name] ?? devices["Desktop Chrome"] })),
});
