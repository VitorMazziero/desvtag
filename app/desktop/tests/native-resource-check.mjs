// AU-P05/B09: real native IPC and from-scratch UI, with explicit partial inference.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { exportReports } from "./native-advanced-power-check.mjs";

const root = resolve(import.meta.dirname, "../../..");
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function recoveryRecords(page) {
  return page.evaluate(async () => {
    const db = await new Promise((ok, fail) => { const q = indexedDB.open("enzitag-optima", 1); q.onsuccess = () => ok(q.result); q.onerror = fail; });
    try {
      return await new Promise((ok, fail) => { const q = db.transaction("recovery").objectStore("recovery").get("workspace"); q.onsuccess = () => ok(q.result?.workspace?.experiments?.find((e) => e.nonlinearResult?.records?.length)?.nonlinearResult?.records); q.onerror = fail; });
    } finally { db.close(); }
  });
}
async function openTool(page) {
  const menu = page.getByTestId("extras-menu");
  if (await menu.getAttribute("open") === null) await menu.locator(":scope > summary").click();
  await page.getByTestId("open-saturation").click();
  return page.getByTestId("saturation-dialog");
}

async function verifyMixedLegend(page, request, directory) {
  const button = (name) => page.getByRole("button", { name, exact: true });
  const checkbox = (name) => page.getByRole("checkbox", { name, exact: true });
  const language = page.locator("header.app-header select").first();
  await language.selectOption("pt-BR");
  await button("Novo projeto").click();
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  await button("Adicionar resposta").click();
  await page.getByLabel("Nome", { exact: true }).fill("Resposta");
  await page.getByTestId("variables-blocks-next").click();
  const units = "Mostrar a coluna de unidade experimental";
  await page.locator("details.advanced").filter({
    has: page.getByRole("checkbox", { name: units, exact: true, includeHidden: true }),
  }).locator(":scope > summary").click();
  await checkbox(units).check();
  await checkbox("Mostrar a coluna de tempo / ocasião").check();
  await button("Adicionar linha").click();
  const values = request.dataset.observations.map(
    (row, i) => `${row.unitId}\t${row.responses[0]}\t${request.advanced.times[i]}`,
  ).join("\n");
  await page.getByRole("textbox", { name: "Unidade experimental — Obs. 1", exact: true })
    .evaluate((element, text) => {
      const clipboard = new DataTransfer();
      clipboard.setData("text/plain", text);
      const paste = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(paste, "clipboardData", { value: clipboard });
      element.dispatchEvent(paste);
    }, values);
  await page.getByTestId("data-blocks-next").click();
  await page.getByRole("combobox", { name: "Estrutura das observações", exact: true }).selectOption("repeated");
  await page.getByTestId("repeated-method").selectOption("mixed");
  await checkbox("Usar inferência e covariâncias avançadas").check();
  await page.getByTestId("mixed-covariance").selectOption("unstructured");
  await page.getByRole("combobox", { name: "Codificação dos fatores categóricos", exact: true }).selectOption("treatment");
  await page.getByTestId("mixed-time-effect").selectOption("categorical");
  await checkbox("Comparar ocasiões do tempo categórico").check();
  await button("Ajustar modelo misto").click();
  await page.getByTestId("mixed-budget-warning").waitFor({ timeout: 90000 });
  const figure = page.getByTestId("mixed-profile-chart");
  for (const [locale, label] of [["pt-BR", "IC indisponível"], ["en", "CI unavailable"]]) {
    await language.selectOption(locale);
    assert.match(await figure.locator("svg").textContent(), new RegExp(label));
    await figure.screenshot({ path: resolve(directory, `native-q12-partial-${locale}.png`) });
  }
  console.log("OK: native from-scratch partial UN presents the confidence interval as unavailable in PT/EN.");
}

export async function runResourceCheck(page, exportDir, directory) {
  mkdirSync(directory, { recursive: true });
  const entry = readFileSync(resolve(root, "app/web/dist/index.html"), "utf8").match(/src="\.\/assets\/(index-[^"]+\.js)"/)?.[1];
  const scripts = await page.locator("script[src]").evaluateAll((items) => items.map((item) => item.src));
  assert.ok(entry && scripts.some((src) => src.endsWith(`/assets/${entry}`)), "Native UI must match the frozen dist entry asset");
  const call = async (operation, expectedIssue) => {
    const response = JSON.parse(await page.evaluate((requestJson) => window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }),
      JSON.stringify({ protocolVersion: 1, taskId: "resource-native", operation })));
    if (expectedIssue) {
      assert.equal(response.outcome.status, "error");
      assert.ok(response.outcome.error.issues.some((issue) => issue.code === expectedIssue), JSON.stringify(response.outcome));
      return response.outcome;
    }
    assert.equal(response.outcome.status, "ok", JSON.stringify(response.outcome));
    const { type, ...result } = response.outcome.result;
    return result;
  };
  const inputs = read("validation/cases/et24/performance-budget-inputs/inputs.json");
  const cases = [];
  for (const input of inputs) {
    const result = await call(input.operation, input.expectedIssue);
    cases.push({ name: input.name, result });
    console.log(`OK native resource: ${input.name}`);
  }
  const hill = cases.find((c) => c.name === "nonlinear-hill-4096").result;
  assert.ok(hill.issues.some((i) => i.code === "nonlinear.profile_budget"));
  assert.equal(hill.n, 4096);
  assert.equal(hill.converged, true);
  assert.equal(hill.residuals.length, 4096);
  for (const p of hill.profiles.filter((p) => p.lowerStatus === "resourceLimit")) {
    assert.equal(p.lower.status, "undefined");
    assert.equal(p.upper.status, "undefined");
    assert.equal(p.unimodalInExaminedRange, false);
  }
  const expected = read("validation/cases/repeated_covariance/resource_q12.json").expected;
  const mixed = cases.find((c) => c.name === "mixed-un-balanced-q12").result.advanced;
  assert.equal(mixed.inferenceAvailable, true);
  mixed.covarianceMatrix.forEach((value,i) => assert.ok(Math.abs(value-expected.covarianceMatrix[i]) < 1e-8));
  mixed.meanProfiles.forEach((point,i) => {
    assert.ok(Math.abs(point.inference.estimate-expected.means[i]) < 1e-8);
    assert.ok(Math.abs(point.inference.df.value-31) < 0.002);
    assert.ok(Math.abs(point.inference.ciLower.value-expected.lower[i]) < 1e-6);
    assert.ok(Math.abs(point.inference.ciUpper.value-expected.upper[i]) < 1e-6);
  });
  const partialRequest = read("validation/cases/et24/performance-budget-inputs/mixed-q12-partial-request.json");
  const partial = await call({ type: "modelMixed", ...partialRequest });
  assert.equal(partial.nObservations, 768);
  assert.ok(partial.issues.some((issue) => issue.code === "mixed.inference_budget"));
  assert.equal(partial.advanced.inferenceAvailable, false);
  for (const [i, point] of partial.advanced.meanProfiles.entries()) {
    assert.ok(Math.abs(point.inference.estimate - expected.means[i]) < 1e-8);
    assert.ok(point.inference.stdError.value > 0);
    assert.equal(point.inference.df.status, "undefined");
    assert.equal(point.inference.ciLower.status, "undefined");
    assert.equal(point.inference.ciUpper.status, "undefined");
  }
  cases.push({ name: "mixed-un-q12-partial-inference", result: partial });
  console.log("OK native resource: completed REML fit and explicit partial inference at q12/64 units");
  const archives = [];
  for (const name of ["older_five_thousand_row_nonlinear_result_reopens_without_applying_new_fit_limits", "older_thirteen_occasion_un_reopens_without_recalculating_or_truncating"]) {
    const path = `validation/cases/project_file/resource_budget/${name}`;
    const bytes = readFileSync(resolve(root, `${path}.enzitag`));
    const decoded = await call({ type: "projectDecode", bytesBase64: bytes.toString("base64") });
    assert.deepEqual(decoded.document, read(`${path}.json`));
    const encoded = await call({ type: "projectEncode", document: decoded.document });
    assert.equal(encoded.sha256, sha(bytes));
    archives.push({ name, sha256: sha(bytes), unchanged: true });
  }
  const operation = read("validation/cases/et24/integrity-power-degree-reproduced/inputs.json")[0].operation;
  operation.spec.terms[0].degree = 2147483648;
  const degreeRefusal = await call(operation, "model.invalid_power");

  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));
  await page.keyboard.press("Escape");
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.evaluate(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.reload();
  if (await page.getByTestId("recovery-banner").isVisible().catch(() => false))
    await page.getByTestId("recovery-banner").getByRole("button", { name: "Descartar", exact: true }).click();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Substrato");
  await page.getByLabel("Tipo", { exact: true }).first().selectOption("numeric");
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Resposta");
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Adicionar linha", exact: true }).click();
  const request = inputs.find((c) => c.name === "nonlinear-hill-4096").operation;
  const lines = request.x.map((x,i) => `${x}\t${request.y[i]}`).join("\n");
  // Synthetic paste into the real grid; this is a data-entry check, not clipboard latency evidence.
  await page.getByLabel("Substrato — Obs. 1", { exact: true }).evaluate((element, text) => {
    const data = new DataTransfer(); data.setData("text/plain", text);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data }); element.dispatchEvent(event);
  }, lines);
  const tool = await openTool(page);
  await tool.getByTestId("saturation-model").selectOption("hill");
  await tool.getByRole("checkbox", { name: "Informar valores iniciais", exact: true }).check();
  for (let i=0;i<request.initial.length;i++) await tool.getByTestId(`nonlinear-initial-${i}`).fill(String(request.initial[i]));
  await tool.getByTestId("nonlinear-profile").check();
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await page.getByTestId("profile-budget-note").waitFor({ timeout: 90000 });
  assert.equal(await page.getByTestId("profile-budget-note").count(), 1);
  for (const language of ["pt-BR", "en"]) {
    await page.locator("header.app-header select").first().selectOption(language);
    for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"]) {
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      await page.getByTestId("saturation-result").screenshot({ path: resolve(directory, `${theme}-${language}.png`) });
    }
    await exportReports(page, exportDir, directory, `resource-${language}`);
  }
  let records;
  for (let i=0;i<100 && !records;i++) { records = await recoveryRecords(page); if (!records) await sleep(100); }
  assert.equal(records?.length, 1);
  assert.deepEqual(records[0].result, hill);
  await page.reload();
  await page.getByTestId("recovery-banner").getByRole("button", { name: /Restore|Restaurar/, exact: true }).click();
  await page.getByTestId("profile-budget-note").waitFor();
  assert.equal(await page.getByTestId("result-record").count(), 0, "A single restored record needs no history selector");
  const mixedLegendVerified = process.env.NATIVE_RESOURCE_LEGEND === "1";
  const examples = [];
  if (mixedLegendVerified) {
    await verifyMixedLegend(page, partialRequest, directory);
    for (const [folder, field] of [
      ["16-perfil-de-saturacao", "nonlinearResult"],
      ["17-potencia-de-contraste", "powerResult"],
    ]) {
      const bytes = readFileSync(resolve(root, "examples", folder, "projeto.enzitag"));
      const decoded = await call({ type: "projectDecode", bytesBase64: bytes.toString("base64") });
      const records = decoded.document.experiments[0][field].records;
      assert.equal(records.length, 1);
      assert.equal(records[0].result.provenance.methodVersion, 2);
      const encoded = await call({ type: "projectEncode", document: decoded.document });
      assert.equal(encoded.sha256, sha(bytes));
      examples.push({ folder, sha256: encoded.sha256, records: records.length });
    }
  }
  writeFileSync(resolve(directory,"verification.json"), JSON.stringify({ binarySha256: sha(readFileSync(process.argv[2])), entry, scripts, cases, archives, degreeRefusal, recoveredRecords: records.length, syntheticGridPaste: true, mixedLegendVerified, examples }, null, 2));
  console.log("OK: native resource boundaries, q12 independent inference, exact older archives, from-scratch partial profile, themes/PT-EN, reports and recovery.");
}
