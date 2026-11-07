// Generate the ET24 examples from scratch using the production UI and real WASM.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { chromium } from "playwright-core";

const root = resolve(import.meta.dirname, "../../..");
const read = (name) => JSON.parse(readFileSync(resolve(root, name), "utf8"));
const url = "http://127.0.0.1:4173/";
const evidence = resolve(root, "app/web/test-results-example-captures/et24");
const profile = read("validation/cases/nonlinear_profile/profile.json").cases.find(
  (item) => item.name === "nist_misra1d",
);
const power = read("validation/cases/power_advanced/native_parity/contrast_unequal.json");
const reference = read("validation/cases/power_advanced/power.json").cases.find(
  (item) => item.name === "contrast_unequal",
);

function button(scope, name) {
  return scope.getByRole("button", { name, exact: true });
}
async function openTool(page, name) {
  const menu = page.getByTestId("extras-menu");
  await menu.locator(":scope > summary").click();
  await page.getByTestId(`open-${name}`).click();
  return page.getByTestId(`${name}-dialog`);
}
async function archive(page, title, resultId, family) {
  await page.getByLabel("Nome do projeto", { exact: true }).fill(title);
  const pending = page.waitForEvent("download");
  await button(page, "Salvar (baixar .enzitag)").click();
  const file = await (await pending).path();
  assert.ok(file);
  const bytes = readFileSync(file);
  const doc = JSON.parse(strFromU8(unzipSync(bytes)["project.json"]));
  await page.addInitScript(() => {
    window.exampleCalculations = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (data, ...args) {
      const operation = data?.requestJson && JSON.parse(data.requestJson).operation.type;
      if (operation === "modelNonlinear" || operation === "powerAnalyze")
        window.exampleCalculations++;
      return Reflect.apply(post, this, [data, ...args]);
    };
  });
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await button(page, "Abrir…").click();
  await (await chooser).setFiles({
    name: `${family}.enzitag`,
    mimeType: "application/zip",
    buffer: bytes,
  });
  await page.getByTestId(resultId).waitFor({ state: "attached" });
  assert.equal(await page.evaluate(() => window.exampleCalculations), 0);
  mkdirSync(evidence, { recursive: true });
  await page
    .getByTestId(resultId)
    .screenshot({ path: resolve(evidence, `${family}-reopened.png`) });
  return { bytes, experiment: doc.experiments[0] };
}
function close(actual, expected, relativeTolerance) {
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * Math.abs(expected),
    `${actual} differs from ${expected}`,
  );
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto(url);
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  const csv = `Pressão;Volume\n${profile.request.x.map((x, i) => `${x};${profile.request.y[i]}`).join("\n")}\n`;
  const chooser = page.waitForEvent("filechooser");
  await button(page, "Importar arquivo (CSV ou XLSX)…").click();
  await (await chooser).setFiles({
    name: "misra1d.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await button(page, "Importar").click();
  const saturation = await openTool(page, "saturation");
  await saturation
    .getByRole("checkbox", { name: "Informar valores iniciais", exact: true })
    .check();
  for (const [i, value] of profile.request.initial.entries())
    await saturation.getByTestId(`nonlinear-initial-${i}`).fill(String(value));
  await saturation.getByTestId("nonlinear-profile").check();
  await button(saturation, "Ajustar curva").click();
  await page.getByTestId("likelihood-profile-a").waitFor({ state: "attached" });
  const fitted = await archive(
    page,
    "NIST Misra1d — perfil de saturação",
    "likelihood-profile-a",
    "nonlinear",
  );
  const fit = fitted.experiment.nonlinearResult.records[0].result;
  assert.equal(fit.provenance.methodVersion, 2);
  assert.equal(fit.n, profile.request.x.length);
  close(fit.sse, profile.expected.sse, 2e-8);
  for (const [i, parameter] of fit.parameters.entries()) {
    close(parameter.estimate, profile.expected.estimates[i], 1e-7);
  }
  fit.profiles.forEach((p, i) => {
    assert.equal(p.lowerStatus, "crossing");
    assert.equal(p.upperStatus, "crossing");
    close(p.lower.value, profile.expected.intervals[i][0], 3e-4);
    close(p.upper.value, profile.expected.intervals[i][1], 3e-4);
  });
  const profileDir = resolve(root, "examples/16-perfil-de-saturacao");
  mkdirSync(profileDir, { recursive: true });
  writeFileSync(resolve(profileDir, "ensaios.csv"), csv);
  writeFileSync(resolve(profileDir, "projeto.enzitag"), fitted.bytes);
  await page.close();

  const next = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await next.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await next.goto(url);
  const tool = await openTool(next, "power");
  const { design, goal, sigma, alpha, simulation, twoSided } = power.request;
  await tool.getByTestId("power-design").selectOption(design.type);
  await tool.getByTestId("power-goal").selectOption(goal.type);
  for (const [id, value] of Object.entries({
    "power-input-sigma": sigma,
    "power-input-alpha": alpha,
    "power-input-n": goal.n,
    "power-input-means": design.means.join(";"),
    "power-weights": design.weights.join(";"),
    "power-allocation": design.allocation.join(";"),
  }))
    await tool.getByTestId(id).fill(String(value));
  await tool.getByRole("checkbox", { name: "Teste bilateral", exact: true }).setChecked(twoSided);
  await tool.getByTestId("power-simulation").check();
  await tool.getByTestId("power-simulation-seed").fill(String(simulation.seed));
  await tool.getByTestId("power-simulation-replications").fill(String(simulation.replications));
  await button(tool, "Calcular").click();
  await next.getByTestId("power-simulation-result").waitFor();
  const prospective = await archive(
    next,
    "Contraste planejado — potência e simulação",
    "power-simulation-result",
    "power",
  );
  const record = prospective.experiment.powerResult.records[0];
  assert.deepEqual(record.input, power.request);
  assert.equal(record.result.provenance.methodVersion, 2);
  assert.equal(record.result.total, 32);
  assert.equal(record.result.df1, 29);
  close(record.result.power.value, reference.expected.power, 1e-7);
  assert.equal(record.result.simulation.replications, simulation.replications);
  const powerDir = resolve(root, "examples/17-potencia-de-contraste");
  mkdirSync(powerDir, { recursive: true });
  writeFileSync(resolve(powerDir, "projeto.enzitag"), prospective.bytes);
  console.log(
    "Saved both ET24 examples through the production UI and checked independent references.",
  );
  console.log(
    JSON.stringify(
      {
        parameters: fit.parameters.map((p) => p.estimate),
        sse: fit.sse,
        intervals: fit.profiles.map((p) => [p.lower.value, p.upper.value]),
        power: record.result.power.value,
        simulation: record.result.simulation,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
