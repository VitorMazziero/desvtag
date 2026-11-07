// ET25 acceptance against the actual Windows WebView2 and engine IPC.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "../../..");
const projectNames = {
  mixture: "qa-18-mistura.enzitag",
  mixed: "qa-19-otimo-misto.enzitag",
  blocks: "qa-superficie-blocos.enzitag",
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fixture = (file) => JSON.parse(readFileSync(resolve(root, "validation/cases", file), "utf8"));

export function prepareEt25Projects(scratch) {
  assert.ok(process.env.APPDATA, "Windows app data directory");
  assert.equal(process.env.NATIVE_ET25_PROFILE, "com.enzitag.optima.et25qa");
  const store = resolve(process.env.APPDATA, process.env.NATIVE_ET25_PROFILE);
  mkdirSync(store, { recursive: true });
  const sources = {
    mixture: resolve(root, "examples/18-mistura-limitada-cox/projeto.enzitag"),
    mixed: resolve(root, "examples/19-otimo-misto-em-blocos/projeto.enzitag"),
    blocks: resolve(root, "validation/cases/et25/b08-blocks-fixtures/surface-with-blocks.enzitag"),
  };
  const projects = Object.fromEntries(
    Object.entries(projectNames).map(([key, name]) => {
      const path = resolve(scratch, name);
      copyFileSync(sources[key], path);
      return [key, { name, path, source: sources[key], sha256: hash(readFileSync(path)) }];
    }),
  );
  const recent = resolve(store, "recent.json");
  if (existsSync(recent)) copyFileSync(recent, resolve(scratch, "prior-qa-recent.json"));
  writeFileSync(
    recent,
    JSON.stringify(Object.values(projects).map(({ name, path }) => ({ name, path }))),
  );
  return projects;
}

function close(actual, expected, label) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-8 * (1 + Math.abs(expected)),
    `${label}: ${actual} vs ${expected}`,
  );
}

function invoke(page, command, payload) {
  return page.evaluate(
    ({ command, payload }) => window.__TAURI_INTERNALS__.invoke(command, payload),
    { command, payload },
  );
}

async function engine(page, operation) {
  const requestJson = JSON.stringify({ protocolVersion: 1, taskId: "native-et25", operation });
  const { outcome } = JSON.parse(await invoke(page, "engine_request", { requestJson }));
  assert.equal(outcome.status, "ok", JSON.stringify(outcome));
  return outcome.result;
}

function load(page, path) {
  return engine(page, {
    type: "projectDecode",
    bytesBase64: readFileSync(path).toString("base64"),
  });
}

const stamp = (path) => `${statSync(path).mtimeMs}:${hash(readFileSync(path))}`;

async function waitForFile(directory, extension, before) {
  for (let attempt = 0; attempt < 150; attempt++) {
    for (const name of readdirSync(directory).filter((file) => file.endsWith(extension))) {
      const path = resolve(directory, name);
      const current = stamp(path);
      if (current !== before.get(name)) {
        await delay(50);
        if (stamp(path) === current) return readFileSync(path);
      }
    }
    await delay(200);
  }
  throw new Error(`Native export did not write ${extension}`);
}

async function exportTo(control, scratch, target) {
  const extension = extname(target);
  const before = new Map(
    readdirSync(scratch)
      .filter((name) => name.endsWith(extension))
      .map((name) => [name, stamp(resolve(scratch, name))]),
  );
  await control.click();
  const bytes = await waitForFile(scratch, extension, before);
  writeFileSync(target, bytes);
  return bytes;
}

async function exportReports(page, scratch, directory, label) {
  for (const [id, ext] of [
    ["report-button", ".html"],
    ["report-pdf-button", ".pdf"],
    ["report-docx-button", ".docx"],
  ]) {
    await exportTo(page.getByTestId(id), scratch, resolve(directory, `${label}${ext}`));
  }
}

async function traceEngineCalls(page) {
  const session = await page.context().newCDPSession(page);
  const observed = [];
  let traceFailure;
  await session.send("Debugger.enable");
  const { result } = await session.send("Runtime.evaluate", {
    expression: "window.__TAURI_INTERNALS__.invoke",
  });
  assert.ok(result.objectId, "native invoke handle");
  session.on("Debugger.paused", async ({ callFrames }) => {
    try {
      const { result: value, exceptionDetails } = await session.send(
        "Debugger.evaluateOnCallFrame",
        {
          callFrameId: callFrames[0].callFrameId,
          expression: "JSON.parse(arguments[1].requestJson).operation.type",
          returnByValue: true,
          silent: true,
        },
      );
      assert.ok(!exceptionDetails && typeof value.value === "string", "native engine operation");
      observed.push(value.value);
    } catch (error) {
      traceFailure = error;
    } finally {
      await session.send("Debugger.resume").catch((error) => {
        traceFailure = error;
      });
    }
  });
  await session.send("Debugger.setBreakpointOnFunctionCall", {
    objectId: result.objectId,
    condition: "arguments[0] === 'engine_request'",
  });
  return (clear = false) => {
    if (traceFailure) throw traceFailure;
    return clear ? observed.splice(0) : [...observed];
  };
}

// Dá tempo aos efeitos assíncronos da tela antes de afirmar que o motor não foi chamado.
const settle = () => delay(1500);

async function openProject(page, project, operations) {
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  operations(true);
  await page.getByRole("button", { name: project.name, exact: true }).click();
  await page.locator(".steps .step").nth(4).click();
}

async function saveLinkedCopy(page) {
  // A função roda no navegador: o valor esperado precisa ir como argumento, não por fechamento.
  const unsaved = (expected) =>
    document.querySelector('[data-testid="status-changes"]')?.dataset.unsaved === expected;
  await page
    .waitForFunction(unsaved, "true", { timeout: 15_000 })
    .catch(() => assert.fail("the edit did not mark the linked project as unsaved"));
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await page
    .waitForFunction(unsaved, "false", { timeout: 30_000 })
    .catch(() => assert.fail("saving the linked copy did not complete"));
}

export async function verifyEt25Engine(request, beforeMixture, beforeMixed) {
  const mixture = beforeMixture.mixtureResult.records[0];
  const matrix = await request({ type: "designMixtureGenerate", ...beforeMixture.mixture });
  assert.equal(matrix.runs.length, 25);
  const bounded = await request({ type: "mixtureAnalyze", ...mixture.input.request });
  assert.deepEqual(bounded.coxTrace.reference, mixture.result.coxTrace.reference);
  close(
    bounded.optimum.candidates[0].desirability,
    mixture.result.optimum.candidates[0].desirability,
    "mixture compromise",
  );
  assert.equal(bounded.optimum.candidates[0].predictions.length, 2);

  const blockedReference = fixture("response_surface/blocked.json").cases[0];
  const surface = await request({ type: "surfaceAnalyze", ...blockedReference.request });
  assert.equal(surface.fit.dfResidual, blockedReference.dfResidual);
  surface.fit.coefficients.forEach((row, i) =>
    close(row.estimate.value, blockedReference.coefficients[i], row.label),
  );

  const designReference = fixture("optimal_design/blocked.json").cases.find(
    (entry) => entry.name === "two-new-blocks-quadratic-i",
  );
  const blocked = await request({ type: "designOptimalGenerate", ...designReference.spec });
  close(blocked.metrics.iAverage, designReference.metrics.iAverage, "blocked I");
  assert.equal(blocked.runs.filter((run) => run.fixed).length, blocked.spec.fixedRuns.length);

  const nominal = fixture("optimal/categories.json").cases.filter((entry) =>
    ["mixed-linear-I", "mixed-interactions-saturated"].includes(entry.name),
  );
  const generated = [];
  for (const reference of nominal) {
    const design = await request({ type: "designOptimalGenerate", ...reference.spec });
    const value =
      reference.spec.criterion === "d"
        ? design.metrics.logDet
        : -design.metrics.iAverage / reference.spec.runs;
    close(value, reference.exhaustive.bestObjective, reference.name);
    generated.push({ name: reference.name, value, search: design.search });
  }

  const rankCase = fixture("factorial_anova/estimability.json").cases.find(
    (entry) => entry.name === "a-confounded-with-c",
  );
  const rank = await request({ type: "anovaFactorial", ...rankCase.request });
  assert.equal(rank.estimability.rank, rankCase.rank);
  assert.equal(rank.estimability.parameters, rankCase.parameters);
  assert.equal(rank.contrasts.length, rankCase.contrasts.length);
  rank.contrasts.forEach((contrast, i) => {
    const expected = rankCase.contrasts[i];
    assert.equal(contrast.estimate.status, expected.estimable ? "defined" : "undefined");
    if (expected.estimable) close(contrast.estimate.value, expected.estimate, contrast.name);
  });

  const storedProfile = beforeMixed.optimalVariances.at(-1);
  const { type: _type, ...profile } = await request({
    type: "designOptimalVariance",
    ...storedProfile.result.request,
  });
  assert.equal(profile.curves.length, 3);
  close(
    profile.curves[2].average.scaled,
    storedProfile.result.curves[2].average.scaled,
    "block profile",
  );

  return {
    mixtureRuns: matrix.runs.length,
    mixtureDesirability: bounded.optimum.candidates[0].desirability,
    surfaceBlock: surface.block.context.reference,
    blockedI: blocked.metrics.iAverage,
    generated,
    estimabilityRank: rank.estimability.rank,
    profileBlocks: profile.curves.length,
  };
}

export async function runEt25Check(page, scratch, directory, executable, projects) {
  mkdirSync(directory, { recursive: true });
  page.on("dialog", (dialog) => dialog.accept());
  const actualRecents = await invoke(page, "project_recent");
  assert.deepEqual(
    actualRecents.map(({ name, path }) => ({ name, path })),
    Object.values(projects).map(({ name, path }) => ({ name, path })),
    "isolated native project list",
  );
  const html = readFileSync(resolve(root, "app/web/dist/index.html"), "utf8");
  const entry = html.match(/assets\/(index-[^"\s]+\.js)/)?.[1];
  const scripts = await page
    .locator('script[type="module"]')
    .evaluateAll((items) => items.map((s) => s.src));
  assert.ok(entry && scripts.some((src) => src.endsWith(`/assets/${entry}`)));

  const beforeMixture = (await load(page, projects.mixture.path)).document.experiments[0];
  const beforeMixed = (await load(page, projects.mixed.path)).document.experiments[0];
  const science = await verifyEt25Engine(
    (operation) => engine(page, operation),
    beforeMixture,
    beforeMixed,
  );

  await page.evaluate(() => {
    localStorage.setItem("optima.language", "pt-BR");
    localStorage.setItem("optima.showAllSections", "1");
  });
  await page.reload();
  await page.locator("header.app-header").waitFor();
  const operations = await traceEngineCalls(page);
  await engine(page, { type: "engineInfo" });
  assert.ok(operations().includes("engineInfo"), "the native engine trace records real requests");
  await page.setViewportSize({ width: 1064, height: 892 });
  await openProject(page, projects.mixture, operations);
  await page.getByTestId("cox-plot").waitFor();
  await page.getByTestId("mixture-optimum-results").waitFor();
  assert.equal(await page.locator('[data-testid="cox-plot"] polyline[data-cox-series]').count(), 3);
  await exportReports(page, scratch, directory, "native-mixture");
  await settle();
  const mixtureOps = operations();
  assert.ok(!mixtureOps.includes("mixtureAnalyze"));

  await openProject(page, projects.blocks, operations);
  await page.getByTestId("contour-chart").waitFor();
  assert.match(await page.getByTestId("block-prediction-context").first().textContent(), /Dia 3/);
  await page
    .getByTestId("surface-view")
    .screenshot({ path: resolve(directory, "native-historical-surface.png") });
  await settle();
  const surfaceOps = operations();
  assert.ok(surfaceOps.includes("surfaceGrid"));
  assert.ok(
    !surfaceOps.some((type) =>
      ["surfaceAnalyze", "surfaceSelectModel", "optimizationGrid", "optimizationRun"].includes(
        type,
      ),
    ),
  );
  await page.getByTestId("rebuild-desirability-grid").waitFor();
  await page.getByRole("button", { name: "Buscar condições ótimas", exact: true }).click();
  await page.getByTestId("desirability-chart").waitFor();
  await saveLinkedCopy(page);
  const optimized = (await load(page, projects.blocks.path)).document.experiments[0].analyses.at(
    -1,
  );
  assert.equal(optimized.result.type, "optimization");
  assert.equal(optimized.result.gridModels.length, 1);
  await openProject(page, projects.blocks, operations);
  await page.getByTestId("desirability-chart").waitFor();
  await settle();
  const savedDesirabilityOps = operations();
  assert.ok(savedDesirabilityOps.includes("optimizationGrid"));
  assert.ok(
    !savedDesirabilityOps.some((type) =>
      ["surfaceAnalyze", "surfaceSelectModel", "optimizationRun"].includes(type),
    ),
  );

  await openProject(page, projects.mixed, operations);
  await page.getByTestId("optimal-model-summary").waitFor();
  assert.match(await page.getByTestId("optimal-model-summary").textContent(), /posto 5 de 5/);
  await exportReports(page, scratch, directory, "native-mixed");
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  const archive = page.getByRole("combobox", { name: "Consultar planejamento salvo", exact: true });
  assert.equal(await archive.inputValue(), "a1");
  await archive.selectOption("");
  const variance = page.getByTestId("optimal-variance-panel");
  await variance.getByTestId("optimal-variance-spatial").waitFor();
  assert.match(await variance.getByTestId("optimal-variance-spatial").textContent(), /Condição: B/);
  const csv = await exportTo(
    variance.getByRole("button", { name: "Dados da variância (CSV)", exact: true }),
    scratch,
    resolve(directory, "native-profile.csv"),
  );
  assert.match(csv.toString("utf8"), /Depois/);
  const xlsx = await exportTo(
    variance.getByRole("button", { name: "Dados da variância (XLSX)", exact: true }),
    scratch,
    resolve(directory, "native-profile.xlsx"),
  );
  assert.equal(xlsx.subarray(0, 2).toString(), "PK");
  const plot = variance.getByTestId("optimal-variance-spatial");
  await plot.getByTestId("figure-menu").locator(":scope > summary").click();
  const svg = await exportTo(
    plot.getByRole("button", { name: "Figura — SVG", exact: true }),
    scratch,
    resolve(directory, "native-profile.svg"),
  );
  assert.match(svg.toString("utf8"), /Condição: B/);
  await settle();
  const mixedOps = operations();
  assert.ok(
    !mixedOps.some((type) =>
      ["designOptimalGenerate", "designOptimalAnalyze", "designOptimalVariance"].includes(type),
    ),
  );

  const themeSelector = page.locator("header.app-header select").nth(1);
  const languageSelector = page.locator("header.app-header select").first();
  const axe = readFileSync(resolve(root, "app/web/node_modules/axe-core/axe.min.js"), "utf8");
  await page.evaluate(axe);
  for (const theme of [
    "soft-light",
    "modern-dark",
    "professional",
    "industrial",
    "organic",
    "clay",
  ]) {
    await themeSelector.selectOption(theme);
    for (const language of ["pt-BR", "en"]) {
      await languageSelector.selectOption(language);
      const violations = await page.evaluate(async () =>
        (await window.axe.run('[data-testid="optimal-variance-panel"]')).violations.map(
          ({ id }) => id,
        ),
      );
      assert.deepEqual(violations, [], `${theme}/${language}`);
      await variance.screenshot({
        path: resolve(directory, `native-variance-${theme}-${language}.png`),
      });
    }
  }
  await languageSelector.selectOption("pt-BR");
  await variance
    .getByRole("combobox", { name: "Escala da variância", exact: true })
    .selectOption("relative");
  await saveLinkedCopy(page);
  const roundTrip = (await load(page, projects.mixed.path)).document.experiments[0];
  assert.deepEqual(roundTrip.optimalDesigns, beforeMixed.optimalDesigns);
  assert.deepEqual(roundTrip.analysisSelection, beforeMixed.analysisSelection);
  assert.deepEqual(roundTrip.analyses, beforeMixed.analyses);
  assert.deepEqual(roundTrip.revisions, beforeMixed.revisions);
  assert.deepEqual(
    roundTrip.optimalVariances.map(({ result }) => result),
    beforeMixed.optimalVariances.map(({ result }) => result),
  );
  assert.equal(roundTrip.optimalVariances.at(-1).view.scaled, false);
  assert.equal(roundTrip.optimalVariances.at(-1).view.mapBlock, 1);
  for (const project of Object.values(projects))
    assert.equal(hash(readFileSync(project.source)), project.sha256);

  await openProject(page, projects.mixed, operations);
  await page.getByTestId("optimal-model-summary").waitFor();
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  assert.equal(
    await variance.getByRole("combobox", { name: "Escala da variância", exact: true }).inputValue(),
    "relative",
  );
  await settle();
  const reopenOps = operations();
  assert.ok(
    !reopenOps.some((type) =>
      ["designOptimalGenerate", "designOptimalAnalyze", "designOptimalVariance"].includes(type),
    ),
  );

  writeFileSync(
    resolve(directory, "native-et25-verification.json"),
    JSON.stringify(
      {
        executableSha256: hash(readFileSync(executable)),
        scripts,
        projectSources: projects,
        checks: {
          ...science,
          mixtureOps,
          surfaceOps,
          savedDesirabilityOps,
          mixedOps,
          reopenOps,
          roundTripView: roundTrip.optimalVariances.at(-1).view,
        },
      },
      null,
      2,
    ),
  );
  console.log(
    "OK: ET25 native science, historical files, report exports, six themes/PT-EN and saved view.",
  );
}
