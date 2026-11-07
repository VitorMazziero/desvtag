// ET22: real native calculations, coexisting saved families and recovery in WebView2.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

async function openTool(page, kind) {
  const menu = page.getByTestId("extras-menu");
  if ((await menu.getAttribute("open")) === null) await menu.locator(":scope > summary").click();
  await page.getByTestId(`open-${kind}`).click();
  return page.getByTestId(`${kind}-dialog`);
}

export async function runFamiliesCheck(page, exportDir, evidenceDir) {
  mkdirSync(evidenceDir, { recursive: true });
  await page.keyboard.press("Escape");
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  page.on("dialog", (dialog) => { console.log(`ET22 native dialog: ${dialog.type()}`); return dialog.accept(); });
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Substrato");
  await page.getByLabel("Tipo", { exact: true }).first().selectOption("numeric");
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Velocidade");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar linha", exact: true }).click();
  const csv = readFileSync(resolve(import.meta.dirname, "../../../examples/08-saturacao-monod/ensaios.csv"), "utf8");
  const lines = csv.trim().split(/\r?\n/).slice(1).map((line) => line.split(",").slice(-2).join("\t")).join("\n");
  await page.getByLabel("Substrato — Obs. 1", { exact: true }).evaluate((el, text) => {
    const data = new DataTransfer(); data.setData("text/plain", text);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data }); el.dispatchEvent(event);
  }, lines);
  await (await openTool(page, "saturation")).getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await page.getByTestId("saturation-result").waitFor();
  const curve = await page.getByTestId("saturation-chart").locator(".chart-canvas").innerHTML();
  await (await openTool(page, "power")).getByRole("button", { name: "Calcular", exact: true }).click();
  await page.getByTestId("power-summary").waitFor();
  if (!(await page.getByTestId("power-summary").textContent()).includes("37 por grupo")) throw new Error("Native power differs from reference");
  // Wait for the application's real autosave, rather than injecting state.
  const recoveryReady = () => page.evaluate(async () => {
    const db = await new Promise((ok, fail) => { const q = indexedDB.open("enzitag-optima", 1); q.onsuccess = () => ok(q.result); q.onerror = fail; });
    try {
      const value = await new Promise((ok, fail) => { const q = db.transaction("recovery").objectStore("recovery").get("workspace"); q.onsuccess = () => ok(q.result); q.onerror = fail; });
      return value?.workspace?.experiments?.some((e) => e.nonlinearResult?.records?.length && e.powerResult?.records?.length);
    } finally { db.close(); }
  });
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt++) { ready = await recoveryReady(); if (!ready) await sleep(100); }
  if (!ready) throw new Error("Native recovery was not saved after both calculations");
  await page.reload();
  await page.getByTestId("recovery-banner").getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByTestId("power-summary").waitFor();
  await page.getByTestId("result-family").selectOption("nonlinear");
  if (await page.getByTestId("saturation-chart").locator(".chart-canvas").innerHTML() !== curve) throw new Error("Native recovery changed original curve");
  await page.getByTestId("saved-family-result").screenshot({ path: resolve(evidenceDir, "native-saturation-restored.png") });
  for (const family of ["nonlinear", "power"]) {
    await page.getByTestId("result-family").selectOption(family);
    for (const [button, ext] of [["report-button", "html"], ["report-pdf-button", "pdf"], ["report-docx-button", "docx"]]) {
      // Only remove this automation run's prior report of the same format.
      for (const file of readdirSync(exportDir).filter((f) => f.endsWith(`-relatorio.${ext}`))) rmSync(resolve(exportDir, file));
      await page.getByTestId(button).click();
      let file;
      for (let attempt = 0; attempt < 120 && !file; attempt++) { file = readdirSync(exportDir).find((f) => f.endsWith(`-relatorio.${ext}`)); if (!file) await sleep(250); }
      if (!file || !existsSync(resolve(exportDir, file))) throw new Error(`Native ${family} ${ext} export missing`);
      copyFileSync(resolve(exportDir, file), resolve(evidenceDir, `native-${family}.${ext}`));
    }
    const html = readFileSync(resolve(evidenceDir, `native-${family}.html`), "utf8");
    if (!html.includes(family === "nonlinear" ? "nonlinear_saturation_fit" : "power_analysis")) throw new Error(`Native ${family} report has wrong provenance`);
  }
  console.log("OK: ET22 native Monod and power calculated from scratch, recovered together with unchanged curve, and exported in HTML/PDF/Word.");
}
