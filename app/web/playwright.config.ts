import { defineConfig, devices } from "@playwright/test";

// O servidor serve o build de produção (inclui o WASM real).
// Navegadores adicionais (Firefox) são habilitados pela variável E2E_BROWSERS.
const browsers = (process.env.E2E_BROWSERS ?? "chromium").split(",");
const projectFor: Record<string, object> = {
  chromium: devices["Desktop Chrome"],
  firefox: devices["Desktop Firefox"],
  chrome: { ...devices["Desktop Chrome"], channel: "chrome" },
  msedge: { ...devices["Desktop Edge"], channel: "msedge" },
  // WebKit do Playwright: o motor do Safari, mas não o Safari em si (ver DT-0026).
  webkit: devices["Desktop Safari"],
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    // Por padrão os testes veem todos os blocos e seções (como antes do percurso guiado, ET29);
    // os testes do percurso guiado e da barra de seções ativa trocam a preferência para «0».
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:4173",
          localStorage: [{ name: "optima.showAllSections", value: "1" }],
        },
      ],
    },
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: browsers.map((name) => ({ name, use: projectFor[name] ?? devices["Desktop Chrome"] })),
});
