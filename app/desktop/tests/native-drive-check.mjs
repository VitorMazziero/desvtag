// ET26 T03: painel do Google Drive no aplicativo Windows real (WebView2 + comandos Tauri).
// Não conecta ao Google (exige conta e navegador interativo): confere a situação, a ausência de
// requisições externas antes de conectar, a interface em seis temas e PT/EN e o axe.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const THEMES = ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"];

export async function runDriveCheck(page, directory) {
  mkdirSync(directory, { recursive: true });
  const external = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const internal = ["tauri.localhost", "ipc.localhost", "127.0.0.1", "localhost"].includes(
      url.hostname,
    );
    if (!internal && !["data:", "blob:", "ipc:"].includes(url.protocol)) external.push(url.origin);
  });
  await page.evaluate(() => {
    localStorage.setItem("optima.language", "pt-BR");
    localStorage.setItem("optima.showAllSections", "1");
  });
  const response = await page.reload();
  await page.locator("header.app-header").waitFor();
  const policy =
    (await response?.headerValue("content-security-policy")) ??
    (await page.locator('meta[http-equiv="Content-Security-Policy" i]').first().getAttribute("content", { timeout: 5000 }));
  assert.match(policy ?? "", /(?:^|;)\s*connect-src\s+[^;]*https:\/\/www\.googleapis\.com(?:\s|;|$)/);

  const status = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke("drive_status"));
  assert.equal(typeof status.connected, "boolean");
  assert.equal(typeof status.available, "boolean");
  const token = status.connected
    ? null
    : await page.evaluate(() =>
        window.__TAURI_INTERNALS__.invoke("drive_access_token").then(() => "ok", String),
      );
  if (!status.connected) assert.equal(token, "auth");

  const menuToggle = page.getByTestId("file-menu").locator(":scope > summary");
  await menuToggle.click();
  const panel = page.getByTestId("drive-panel");
  await panel.waitFor();
  await page.keyboard.press("Escape");
  await panel.waitFor({ state: "hidden" });
  assert.ok(await menuToggle.evaluate((element) => element === document.activeElement));
  await menuToggle.press("Space", { delay: 60 });
  await panel.waitFor();
  assert.equal(await page.getByText("ainda não está disponível").count(), 0, "nota antiga removida");
  assert.equal(await panel.getByRole("button", { name: /Abrir do Drive/ }).count(), 0);
  const connect = panel.getByRole("button", { name: "Conectar ao Google Drive", exact: true });
  if (!status.connected) {
    assert.equal(await connect.isDisabled(), !status.available);
    assert.equal(await page.getByTestId("drive-unavailable").count(), status.available ? 0 : 1);
  }
  assert.deepEqual(external, [], "nenhuma requisição externa antes de conectar");

  const axe = readFileSync(resolve(import.meta.dirname, "../../web/node_modules/axe-core/axe.min.js"), "utf8");
  await page.evaluate(axe);
  const themeSelector = page.locator("header.app-header select").nth(1);
  const languageSelector = page.locator("header.app-header select").first();
  const checks = [];
  for (const theme of THEMES) {
    await themeSelector.selectOption(theme);
    for (const language of ["pt-BR", "en"]) {
      await languageSelector.selectOption(language);
      if (!(await panel.isVisible())) {
        await page.getByTestId("file-menu").locator(":scope > summary").click();
        await panel.waitFor();
      }
      const violations = await page.evaluate(async () =>
        (await window.axe.run('[data-testid="drive-panel"]')).violations.map(({ id }) => id),
      );
      assert.deepEqual(violations, [], `${theme}/${language}`);
      await panel.screenshot({ path: resolve(directory, `native-drive-${theme}-${language}.png`) });
      checks.push({ theme, language, violations });
    }
  }
  assert.deepEqual(external, [], "nenhuma requisição externa durante a inspeção");
  writeFileSync(
    resolve(directory, "native-drive-verification.json"),
    JSON.stringify({ status, tokenWithoutConnection: token, policy, keyboard: true, checks, external }, null, 2),
  );
  console.log(`OK: painel do Drive no Windows (conectado=${status.connected}, disponível=${status.available}).`);
}
