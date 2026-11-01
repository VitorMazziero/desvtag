import { defineConfig, devices } from "@playwright/test";

// O servidor serve o build de produção (inclui o WASM real).
// Navegadores adicionais (Firefox) são habilitados pela variável E2E_BROWSERS.
const browsers = (process.env.E2E_BROWSERS ?? "chromium").split(",");
const projectFor: Record<string, object> = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  msedge: { ...devices["Desktop Edge"], channel: "msedge" },
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: browsers.map((name) => ({ name, use: projectFor[name] ?? devices["Desktop Chrome"] })),
});
