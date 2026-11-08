// AU-P04: actual native IPC, typed archive recovery and visible partial precision.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { exportReports } from "./native-advanced-power-check.mjs";

export async function runPrecisionCheck(page, exportDir, directory) {
  mkdirSync(directory, { recursive: true });
  const call = async (operation) => {
    const response = JSON.parse(await page.evaluate((requestJson) =>
      window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }),
      JSON.stringify({ protocolVersion: 1, taskId: "precision-native", operation })));
    assert.equal(response.outcome.status, "ok", JSON.stringify(response.outcome));
    const { type, ...result } = response.outcome.result;
    return result;
  };
  const template = JSON.parse(readFileSync(resolve(import.meta.dirname,
    "../../../validation/cases/project_file/power_advanced/planned_contrast_power_and_simulation_round_trip_without_recalculation.json"), "utf8"));
  const designs = [
    { type: "oneSampleT", difference: 1e308 },
    { type: "twoSampleT", difference: 1e308 },
    { type: "pairedT", difference: 1e308 },
    { type: "contrast", means: [0, 1e308], weights: [-1, 1], allocation: [1, 1] },
    { type: "twoLevel", factors: 1, terms: [[0]], effects: [1e308], target: 0 },
  ];
  const results = [];
  for (const design of designs) {
    const input = { design, sigma: 1e-308, alpha: 0.05, twoSided: true,
      goal: { type: "precisionFor", halfWidth: 1e-307 }, simulation: { seed: 42, replications: 1000 } };
    const result = await call({ type: "powerAnalyze", ...input });
    assert.equal(result.n, 2);
    assert.equal(result.noncentrality, null);
    assert.equal(result.power.status, "undefined");
    assert.ok(result.halfWidth.value > 0 && result.halfWidth.value <= 1e-307);
    assert.equal(result.simulation, undefined);
    const document = structuredClone(template);
    Object.assign(document.experiments[0].powerResult.records[0], { input, result });
    const encoded = await call({ type: "projectEncode", document });
    const decoded = await call({ type: "projectDecode", bytesBase64: encoded.bytesBase64 });
    assert.deepEqual(decoded.document.experiments[0].powerResult.records[0].result, result);
    writeFileSync(resolve(directory, `${design.type}.enzitag`), Buffer.from(encoded.bytesBase64, "base64"));
    results.push({ input, result });
  }
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  await page.keyboard.press("Escape");
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.evaluate(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.reload();
  if (await page.getByTestId("recovery-banner").isVisible().catch(() => false))
    await page.getByTestId("recovery-banner").getByRole("button", { name: "Descartar", exact: true }).click();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  for (const kind of ["contrast", "twoLevel"]) {
    const menu = page.getByTestId("extras-menu");
    if (await menu.getAttribute("open") === null) await menu.locator(":scope > summary").click();
    await page.getByTestId("open-power").click();
    const tool = page.getByTestId("power-dialog");
    await tool.getByTestId("power-design").selectOption(kind);
    await tool.getByTestId("power-goal").selectOption("precisionFor");
    await tool.getByTestId("power-input-sigma").fill("1e-308");
    await tool.getByTestId("power-input-halfWidth").fill("1e-307");
    if (kind === "contrast") {
      await tool.getByTestId("power-input-means").fill("0;1e308");
      await tool.getByTestId("power-weights").fill("-1;1");
      await tool.getByTestId("power-allocation").fill("1;1");
    } else {
      await tool.getByTestId("power-factorCount").fill("1");
      await tool.getByTestId("power-terms").fill("1");
      await tool.getByTestId("power-effects").fill("1e308");
      await tool.getByTestId("power-targetTerm").selectOption("0");
    }
    await tool.getByTestId("power-simulation").check();
    await tool.getByTestId("power-simulation-seed").fill("42");
    await tool.getByTestId("power-simulation-replications").fill("1000");
    await tool.getByRole("button", { name: "Calcular", exact: true }).click();
    await page.getByTestId("power-warning").filter({ hasText: "fora da faixa numérica" }).waitFor();
    assert.equal(await page.getByTestId("power-chart").count(), 0);
    for (const language of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(language);
      for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"]) {
        await page.locator("header.app-header select").nth(1).selectOption(theme);
        await page.getByTestId("power-result").screenshot({ path: resolve(directory, `${kind}-${theme}-${language}.png`) });
      }
      await exportReports(page, exportDir, directory, `${kind}-${language}`);
    }
    await page.locator("header.app-header select").first().selectOption("pt-BR");
  }
  let saved;
  for (let attempt = 0; attempt < 100 && !saved; attempt++) {
    saved = await page.evaluate(async () => {
      const db = await new Promise((ok, fail) => { const q = indexedDB.open("enzitag-optima", 1); q.onsuccess = () => ok(q.result); q.onerror = fail; });
      try {
        return await new Promise((ok, fail) => { const q = db.transaction("recovery").objectStore("recovery").get("workspace"); q.onsuccess = () => {
          const record = q.result?.workspace?.experiments?.find((e) => e.powerResult?.records?.length === 2);
          ok(record?.powerResult?.records);
        }; q.onerror = fail; });
      } finally { db.close(); }
    });
    if (!saved) await sleep(100);
  }
  assert.ok(saved, "Partial precision recovery not stored");
  assert.ok(saved.every((r) => r.result.noncentrality === null && r.result.power.status === "undefined"));
  await page.reload();
  await page.getByTestId("recovery-banner").getByRole("button", { name: "Restaurar", exact: true }).click();
  await page.getByTestId("power-warning").filter({ hasText: "fora da faixa numérica" }).waitFor();
  assert.equal(await page.getByTestId("result-record").locator("option").count(), 2);
  writeFileSync(resolve(directory, "verification.json"), JSON.stringify({ nativeResults: results, recoveredRecords: saved }, null, 2));
  console.log("OK: native partial precision in five designs, exact typed archives, two real UI designs, six themes/PT-EN, reports and recovery.");
}
