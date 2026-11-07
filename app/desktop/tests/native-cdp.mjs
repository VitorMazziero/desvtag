// Verificação nativa no Windows: abre o aplicativo Tauri real com a depuração remota do WebView2
// ativada por variável de ambiente e o controla por CDP com Playwright (sem msedgedriver).
// Uso: node tests/native-cdp.mjs <caminho-do-executável>
// Requer `npm ci` em app/web (traz o módulo `playwright`; não é preciso baixar navegadores).
import { execSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { runRepeatedCheck } from "./native-repeated-check.mjs";
import { runAdvancedPowerCheck } from "./native-advanced-power-check.mjs";
import { runFamiliesCheck } from "./native-families-check.mjs";
import { runChecks } from "./native-checks.mjs";
import { runPolishCheck } from "./native-polish-check.mjs";
import { runPdfCheck } from "./native-pdf-check.mjs";
import { runV03Check } from "./native-v03-check.mjs";

const app = process.argv[2];
if (!app) {
  console.error("Uso: node tests/native-cdp.mjs <executável>");
  process.exit(2);
}
const { chromium } = await import(
  pathToFileURL(resolve(import.meta.dirname, "../../web/node_modules/playwright-core/index.mjs"))
    .href
);
const port = 9333;
// A porta é habilitada no próprio executável de teste (`additionalBrowserArgs` via TAURI_CONFIG na CI);
// a variável de ambiente é mantida por compatibilidade, mas o Tauri a ignora.
// Pasta das exportações da verificação (só vale no executável construído com `--features automation`).
const exportDir = mkdtempSync(resolve(tmpdir(), "enzitag-export-"));
const et25Evidence = process.env.NATIVE_ET25_EVIDENCE;
const et25 = et25Evidence ? await import("./native-et25-check.mjs") : undefined;
const et25Projects = et25?.prepareEt25Projects(exportDir);
const child = spawn(resolve(app), [], {
  stdio: "ignore",
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}`,
    ENZITAG_EXPORT_DIR: exportDir,
    ...(et25Projects || process.env.NATIVE_DRIVE_EVIDENCE
      ? { WEBVIEW2_USER_DATA_FOLDER: process.env.NATIVE_DRIVE_PROFILE ?? resolve(exportDir, "webview") }
      : {}),
  },
});
let failed = false;
let browser;
let page;
try {
  let ready = false;
  for (let i = 0; i < 300 && !ready; i++) {
    if (child.exitCode !== null)
      throw new Error(`O aplicativo encerrou com código ${child.exitCode}`);
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
  for (let i = 0; i < 100 && !page; i++) {
    page = browser
      .contexts()
      .flatMap((c) => c.pages())
      .find((p) => !p.url().startsWith("devtools"));
    if (!page) await sleep(200);
  }
  if (!page) throw new Error("Nenhuma página do WebView2 encontrada");
  await page.locator("header.app-header").waitFor({ state: "visible", timeout: 60_000 });
  console.log("Página:", page.url());
  if (process.env.NATIVE_OPTIMAL_EVIDENCE) {
    const { runOptimalCheck } = await import("./native-optimal-check.mjs");
    await runOptimalCheck(page, process.env.NATIVE_OPTIMAL_EVIDENCE, resolve(app));
  }
  if (process.env.NATIVE_DRIVE_EVIDENCE) {
    if (process.env.ENZITAG_TEST_PICKER_HANDOFF) {
      const { runPickerCheck } = await import("./native-drive-picker-check.mjs");
      await runPickerCheck(page, chromium, process.env.NATIVE_DRIVE_EVIDENCE);
    } else if (process.env.NATIVE_DRIVE_QUEUE) {
      const { runQueueCheck } = await import("./native-drive-queue-check.mjs");
      await runQueueCheck(page, process.env.NATIVE_DRIVE_EVIDENCE, process.env.NATIVE_DRIVE_QUEUE);
    } else {
      const { runDriveCheck } = await import("./native-drive-check.mjs");
      await runDriveCheck(page, process.env.NATIVE_DRIVE_EVIDENCE);
    }
  }
  if (et25 && et25Projects && et25Evidence) {
    await et25.runEt25Check(page, exportDir, et25Evidence, resolve(app), et25Projects);
  }
  if (
    process.env.NATIVE_ET23_ONLY !== "1" &&
    process.env.NATIVE_ET24_ONLY !== "1" &&
    process.env.NATIVE_ET25_ONLY !== "1" &&
    process.env.NATIVE_DRIVE_ONLY !== "1"
  ) {
    await runChecks({
      text: async (testId) =>
        (await page.locator(`[data-testid="${testId}"]`).textContent({ timeout: 2000 })) ?? "",
      invoke: (requestJson) =>
        page.evaluate(
          (json) => window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson: json }),
          requestJson,
        ),
    });
    await runPdfCheck(page, exportDir);
    if (process.env.NATIVE_ET27_EVIDENCE)
      await runPolishCheck(page, exportDir, process.env.NATIVE_ET27_EVIDENCE);
    await runV03Check(page, exportDir);
    if (process.env.NATIVE_ET22_EVIDENCE)
      await runFamiliesCheck(page, exportDir, process.env.NATIVE_ET22_EVIDENCE);
  }
  if (process.env.NATIVE_ET23_EVIDENCE)
    await runRepeatedCheck(page, exportDir, process.env.NATIVE_ET23_EVIDENCE);
  if (process.env.NATIVE_ET24_EVIDENCE)
    await runAdvancedPowerCheck(page, exportDir, process.env.NATIVE_ET24_EVIDENCE);
  if (process.env.NATIVE_UI_TABLES_EVIDENCE) {
    const { runUiTablesCheck } = await import("./native-ui-tables-check.mjs");
    await runUiTablesCheck(page, exportDir, process.env.NATIVE_UI_TABLES_EVIDENCE, child.pid);
  }
  if (process.env.NATIVE_EXECUTION_EVIDENCE) {
    const { runExecutionCheck } = await import("./native-execution-check.mjs");
    await runExecutionCheck(page, process.env.NATIVE_EXECUTION_EVIDENCE);
  }
  if (process.env.NATIVE_PERFORMANCE_EVIDENCE) {
    const { runPerformanceCheck } = await import("./native-performance-check.mjs");
    await runPerformanceCheck(page, process.env.NATIVE_PERFORMANCE_EVIDENCE, child.pid);
  }
  if (process.env.NATIVE_PRECISION_EVIDENCE) {
    const { runPrecisionCheck } = await import("./native-precision-check.mjs");
    await runPrecisionCheck(page, exportDir, process.env.NATIVE_PRECISION_EVIDENCE);
  }
  if (process.env.NATIVE_RESOURCE_EVIDENCE) {
    const { runResourceCheck } = await import("./native-resource-check.mjs");
    await runResourceCheck(page, exportDir, process.env.NATIVE_RESOURCE_EVIDENCE);
  }
} catch (error) {
  failed = true;
  console.error("FALHA:", error);
  const failureDir = process.env.NATIVE_DRIVE_EVIDENCE ?? et25Evidence ?? process.env.NATIVE_OPTIMAL_EVIDENCE ?? process.env.NATIVE_RESOURCE_EVIDENCE ?? process.env.NATIVE_UI_TABLES_EVIDENCE ?? process.env.NATIVE_EXECUTION_EVIDENCE ?? process.env.NATIVE_PRECISION_EVIDENCE ?? process.env.NATIVE_PERFORMANCE_EVIDENCE ?? process.env.NATIVE_ET24_EVIDENCE ?? process.env.NATIVE_ET23_EVIDENCE;
  if (page && failureDir) {
    mkdirSync(failureDir, { recursive: true });
    await page
      .screenshot({
        path: resolve(failureDir, `native-failure-${Date.now()}.png`),
        fullPage: true,
      })
      .catch(() => {});
  }
} finally {
  await browser?.close().catch(() => {});
  child.kill();
}
process.exit(failed ? 1 : 0);
