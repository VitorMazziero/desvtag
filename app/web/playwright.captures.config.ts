import { defineConfig, devices } from "@playwright/test";

// Capturas de tela da interface (PT e EN, seis temas) para a documentação.
// Uso: npx playwright test -c playwright.captures.config.ts   (grava em docs/imagens/capturas/)
export default defineConfig({
  testDir: "tests/captures",
  timeout: 120_000,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 300_000,
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});
