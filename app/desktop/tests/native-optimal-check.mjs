// ET25 block 07. Independent stationary designs through native IPC and real UI.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export async function runOptimalCheck(page, directory, executable) {
  page.on("dialog", (dialog) => dialog.accept());
  mkdirSync(directory, { recursive: true });
  const html = readFileSync(resolve(import.meta.dirname, "../../web/dist/index.html"), "utf8");
  const entry = html.match(/assets\/(index-[^"\s]+\.js)/)?.[1];
  const scripts = await page.locator('script[type="module"]').evaluateAll((items) => items.map((s) => s.src));
  assert.ok(entry && scripts.some((src) => src.endsWith(`/assets/${entry}`)), "Native entry must match the current frozen dist");
  const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname,
    "../../../validation/cases/optimal_design/optimal.json"), "utf8"));
  const observations = [];
  for (const item of fixture.exchangeCases) {
    for (let seed = 1; seed <= 5; seed++) {
      const operation = { type: "designOptimalGenerate", ...item.spec, seed,
        factors: item.spec.factors.map((factor, index) => ({ id: `f${index + 1}`, ...factor })) };
      const response = JSON.parse(await page.evaluate((requestJson) =>
        window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }),
      JSON.stringify({ protocolVersion: 1, taskId: "optimal-native", operation })));
      observations.push({ name: item.name, seed, response });
      if (response.outcome.status === "error") {
        assert.ok(response.outcome.error.issues.some((issue) => issue.code === "design.optimal_singular"));
        continue;
      }
      const result = response.outcome.result;
      const free = result.runs.filter((row) => !row.fixed).map((row) => row.real);
      const canonical = (rows) => JSON.stringify(rows.map((row) => JSON.stringify(row)).sort());
      const reference = item.stationary.find((candidate) => canonical(candidate.freeRuns) === canonical(free));
      assert.ok(reference, `${item.name}/${seed}: improving exchange remains`);
      const value = operation.criterion === "d" ? result.metrics.logDet : -result.metrics.iAverage / operation.runs;
      assert.ok(Math.abs(value - reference.value) <= 1e-9 * (1 + Math.abs(reference.value)));
      assert.equal(result.search.startsAttempted, 1);
      assert.equal(result.search.startsSucceeded + result.search.startsFailed, 1);
      assert.equal(result.search.selectedStop, "noImprovingExchange");
    }
  }
  const limitedOperation = {
    type: "designOptimalGenerate", ...fixture.exchangeCases[0].spec,
    factors: Array.from({ length: 4 }, (_, i) => ({ id: `f${i}`, name: `X${i}`, low: -1, high: 1 })),
    runs: 60, levels: 5, model: "quadratic", criterion: "i", seed: 1,
  };
  const limited = JSON.parse(await page.evaluate((requestJson) =>
    window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }),
  JSON.stringify({ protocolVersion: 1, taskId: "optimal-native-limit", operation: limitedOperation })));
  assert.equal(limited.outcome.result.search.selectedStop, "passLimit");
  assert.equal(limited.outcome.result.search.evaluations, 2246400);
  observations.push({ name: "actual-pass-limit", response: limited });
  await page.evaluate(() => {
    localStorage.setItem("optima.language", "pt-BR");
    localStorage.setItem("optima.showAllSections", "1");
  });
  await page.reload();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await page.getByTestId("objective-plan").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Temperatura");
  await page.getByLabel("Tipo").first().selectOption("numeric");
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByTestId("design-mode").getByRole("radio", { name: /Ótimo D\/I/ }).check();
  await page.getByLabel("Limite baixo de Temperatura").fill("-1");
  await page.getByLabel("Limite alto de Temperatura").fill("1");
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("linear");
  await page.getByLabel("Total de ensaios", { exact: true }).fill("2");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("1");
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("2");
  await page.getByLabel("Aleatorizar a ordem de execução dos ensaios novos", { exact: true }).uncheck();
  for (const criterion of ["d", "i"]) {
    await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption(criterion);
    await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
    await page.getByTestId("optimal-stop").waitFor();
    const values = await page.getByTestId("optimal-table").locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => Number(row.querySelectorAll("td")[1]?.textContent?.replace(",", "."))));
    assert.deepEqual(values.sort((a, b) => a - b), [-1, 1]);
    const details = page.getByTestId("optimal-search-details");
    if (await details.getAttribute("open") === null) await details.locator("summary").click();
    for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"]) {
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      for (const language of ["pt-BR", "en"]) {
        await page.locator("header.app-header select").first().selectOption(language);
        await page.getByTestId("optimal-result").scrollIntoViewIfNeeded();
        const heights = await page.getByTestId("optimal-panel").locator('input[type="number"]').evaluateAll(
          (inputs) => inputs.map((input) => input.getBoundingClientRect().height));
        assert.ok(heights.every((height) => height >= 40));
        await page.screenshot({ path: resolve(directory, `${criterion}-${theme}-${language}.png`) });
      }
    }
    await page.locator("header.app-header select").first().selectOption("pt-BR");
  }
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  assert.notEqual(await page.getByLabel("Temperatura — Obs. 1", { exact: true }).inputValue(), "");
  const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
  writeFileSync(resolve(directory, "native-optimal.json"), JSON.stringify({
    executableSha256: sha(readFileSync(executable)), url: page.url(),
    scripts: await page.locator('script[type="module"]').evaluateAll((scripts) => scripts.map((s) => s.src)),
    observations,
  }, null, 2));
  console.log("OK: 60 native optimal attempts against independent enumeration, D/I from scratch, six themes/PT-EN and grid application.");
}
