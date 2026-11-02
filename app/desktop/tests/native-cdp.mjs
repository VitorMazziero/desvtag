// Verificação nativa no Windows: abre o aplicativo Tauri real com a depuração remota do WebView2
// ativada por variável de ambiente e o controla por CDP com Playwright (sem msedgedriver).
// Uso: node tests/native-cdp.mjs <caminho-do-executável>
// Requer `npm ci` em app/web (traz o módulo `playwright`; não é preciso baixar navegadores).
import { execSync, spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { runChecks } from "./native-checks.mjs";
import { runPdfCheck } from "./native-pdf-check.mjs";
import { runV03Check } from "./native-v03-check.mjs";

const app = process.argv[2];
if (!app) {
  console.error("Uso: node tests/native-cdp.mjs <executável>");
  process.exit(2);
}
const { chromium } = await import(pathToFileURL(resolve(import.meta.dirname, "../../web/node_modules/playwright-core/index.mjs")).href);
const port = 9333;
// A porta é habilitada no próprio executável de teste (`additionalBrowserArgs` via TAURI_CONFIG na CI);
// a variável de ambiente é mantida por compatibilidade, mas o Tauri a ignora.
// Pasta das exportações da verificação (só vale no executável construído com `--features automation`).
const exportDir = mkdtempSync(resolve(tmpdir(), "enzitag-export-"));
const child = spawn(resolve(app), [], {
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`,
    ENZITAG_EXPORT_DIR: exportDir,
  },
});
let failed = false;
let browser;
try {
  let ready = false;
  for (let i = 0; i < 300 && !ready; i++) {
    if (child.exitCode !== null) throw new Error(`O aplicativo encerrou com código ${child.exitCode}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${port}/json/version`)).ok;
    } catch {
      await sleep(200);
    }
  }
  if (!ready) {
    // Diagnóstico: processos do WebView2 (com a linha de comando) e portas em escuta.
    for (const command of [
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'webview2|optima' } | Select-Object Name,ProcessId,CommandLine | Format-List | Out-String -Width 4000"`,
      `netstat -ano -p TCP`,
    ]) {
      try {
        console.error(`> ${command}\n${execSync(command, { encoding: "utf8" })}`);
      } catch (error) {
        console.error(`diagnóstico falhou: ${error}`);
      }
    }
    throw new Error("A depuração remota do WebView2 não ficou disponível em 60 s");
  }
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith("devtools"));
    if (!page) await sleep(200);
  }
  if (!page) throw new Error("Nenhuma página do WebView2 encontrada");
  console.log("Página:", page.url());
  await runChecks({
    text: async (testId) => (await page.locator(`[data-testid="${testId}"]`).textContent({ timeout: 2000 })) ?? "",
    invoke: (requestJson) =>
      page.evaluate((json) => window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson: json }), requestJson),
  });
  await runPdfCheck(page, exportDir);
  await runV03Check(page, exportDir);
} catch (error) {
  failed = true;
  console.error("FALHA:", error);
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
process.exit(failed ? 1 : 0);
