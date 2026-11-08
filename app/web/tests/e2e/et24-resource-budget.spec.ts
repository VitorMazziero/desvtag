import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openSaturationTool } from "./menus";
import { setupProfile } from "./nonlinearTools";
import { configureRepeated, runRepeated } from "./repeatedTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

const inputs = JSON.parse(
  readFileSync(
    new URL(
      "../../../../validation/cases/et24/performance-budget-inputs/inputs.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
test.use({ locale: "pt-BR", acceptDownloads: true });

async function observeCalculations(page: Page) {
  await page.addInitScript(() => {
    const host = window as unknown as { budgetCalculations: number };
    host.budgetCalculations = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = message as { requestJson?: string };
      if (
        data.requestJson &&
        ["modelNonlinear", "modelMixed", "powerAnalyze"].includes(
          JSON.parse(data.requestJson).operation.type,
        )
      )
        host.budgetCalculations++;
      return Reflect.apply(post, this, [message, ...args]);
    };
  });
}

test("AU-P05: a thousand stored analyses can be reopened and browsed without calculation", async ({
  page,
}, info) => {
  await observeCalculations(page);
  const source = JSON.parse(
    readFileSync(
      new URL(
        "../../../../validation/cases/et24/performance-before-history-web/history-1000-encode.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const archive = Buffer.from(source.response.outcome.result.bytesBase64, "base64");
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles({
    name: "historico-1000.enzitag",
    mimeType: "application/zip",
    buffer: archive,
  });
  const record = page.getByTestId("result-record");
  const identity = page.getByTestId("family-result-identity");
  await expect(record.locator("option")).toHaveCount(1000);
  const earliest = source.operation.document.experiments[0].powerResult.records[0].id;
  for (const id of [earliest, "benchmark-power-500", "benchmark-power-999"]) {
    await record.selectOption(id);
    await expect(identity).toContainText(id);
    await expect(page.getByTestId("power-summary")).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => (window as unknown as { budgetCalculations: number }).budgetCalculations,
    ),
  ).toBe(0);
  await page.setViewportSize({ width: 1064, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("historico-1000-reaberto.png") });
});

for (const partial of [false, true])
  test(`AU-P05: UN with 12 occasions presents ${partial ? "partial" : "full"} inference`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          "../../../../validation/cases/repeated_covariance/resource_q12.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const { expected } = fixture;
    const request = partial
      ? JSON.parse(
          readFileSync(
            new URL(
              "../../../../validation/cases/et24/performance-budget-inputs/mixed-q12-partial-request.json",
              import.meta.url,
            ),
            "utf8",
          ),
        )
      : fixture.request;
    const rows = request.dataset.observations.map(
      (row: { unitId: string; responses: number[] }, i: number) => ({
        unit: row.unitId,
        y: row.responses[0],
        time: request.advanced.times[i],
      }),
    );
    await configureRepeated(page, { name: "balanced-un-q12", structure: "unstructured", rows });
    await expect(page.getByTestId("mixed-options")).toContainText("12 ocasiões na UN");
    await runRepeated(page, 30000);
    const matrix = page.getByTestId("mixed-covariance-matrix");
    await expect(matrix.locator("tbody tr")).toHaveCount(12);
    await expect(matrix.locator("tbody tr").first().locator("td")).toHaveCount(13);
    const warning = page.getByTestId("mixed-budget-warning");
    if (partial) await expect(warning).toContainText("O ajuste REML foi preservado");
    else await expect(warning).toHaveCount(0);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const path = info.outputPath("balanced-un-q12.enzitag");
    await (await pending).saveAs(path);
    const bytes = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
    if (!bytes) throw new Error("Missing project document");
    const doc = JSON.parse(strFromU8(bytes));
    const stored = doc.experiments[0].mixedModelResult.records[0].result;
    expect(stored.nObservations).toBe(partial ? 768 : 384);
    const result = stored.advanced;
    expect(result.inferenceAvailable).toBe(!partial);
    if (!partial) expect(result.remlLogLikelihood).toBeCloseTo(expected.remlLogLikelihood, 7);
    expect(result.meanProfiles).toHaveLength(12);
    for (const [i, point] of result.meanProfiles.entries()) {
      expect(point.inference.estimate).toBeCloseTo(expected.means[i], 7);
      if (partial) {
        expect(point.inference.stdError.value).toBeGreaterThan(0);
        expect(point.inference.df.status).toBe("undefined");
        expect(point.inference.ciLower.status).toBe("undefined");
        expect(point.inference.ciUpper.status).toBe("undefined");
      } else {
        expect(point.inference.stdError.value).toBeCloseTo(expected.meanStandardErrors[i], 7);
        expect(point.inference.df.value).toBeCloseTo(expected.df, 2);
        expect(point.inference.ciLower.value).toBeCloseTo(expected.lower[i], 5);
        expect(point.inference.ciUpper.value).toBeCloseTo(expected.upper[i], 5);
      }
    }
    await page.setViewportSize({ width: 1064, height: 892 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const figure = page.getByTestId("mixed-profile-chart");
    await expect(figure.locator("svg")).toContainText(
      partial ? "IC indisponível" : "média modelada e IC",
    );
    if (partial) {
      await warning.screenshot({ path: info.outputPath("inferencia-parcial-pt-BR.png") });
      await page.locator("header.app-header select").first().selectOption("en");
      await expect(warning).toContainText("The REML fit was preserved");
      await expect(figure.locator("svg")).toContainText("CI unavailable");
      await figure.getByTestId("figure-menu").locator(":scope > summary").click();
      const svg = page.waitForEvent("download");
      await figure.getByRole("button", { name: /Figure.*SVG/ }).click();
      const svgPath = info.outputPath("un-q12-partial.svg");
      await (await svg).saveAs(svgPath);
      const text = readFileSync(svgPath, "utf8");
      expect(text).toContain("CI unavailable");
      expect(text).not.toContain("modeled mean and CI");
      await warning.screenshot({ path: info.outputPath("inferencia-parcial-en.png") });
    }
    await matrix.screenshot({ path: info.outputPath("un-q12-covariance.png") });
    await figure.screenshot({ path: info.outputPath("un-q12-profile.png") });
  });

async function actualWorker(page: Page, operation: unknown) {
  return page
    .evaluate(async (operation) => {
      const host = window as unknown as { budgetWorkerUrl: string };
      const worker = new Worker(host.budgetWorkerUrl, { type: "module" });
      try {
        return await new Promise<string>((resolve, reject) => {
          worker.onmessage = (e) =>
            e.data.ok ? resolve(e.data.responseJson) : reject(new Error(e.data.message));
          worker.onerror = (e) => reject(new Error(e.message));
          worker.postMessage({
            id: 1,
            requestJson: JSON.stringify({ protocolVersion: 1, taskId: "resource-ui", operation }),
          });
        });
      } finally {
        worker.terminate();
      }
    }, operation)
    .then((response) => JSON.parse(response));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const Original = Worker;
    window.Worker = new Proxy(Original, {
      construct(Target, args) {
        (window as unknown as { budgetWorkerUrl: string }).budgetWorkerUrl = String(args[0]);
        return Reflect.construct(Target, args);
      },
    });
  });
});

for (const family of ["nonlinear", "mixed"] as const)
  test(`AU-P05: older oversized ${family} archive opens unchanged; refused refit is focused and preserves history`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await observeCalculations(page);
    const filename =
      family === "nonlinear"
        ? "older_five_thousand_row_nonlinear_result_reopens_without_applying_new_fit_limits"
        : "older_thirteen_occasion_un_reopens_without_recalculating_or_truncating";
    const directory = new URL(
      "../../../../validation/cases/project_file/resource_budget/",
      import.meta.url,
    );
    const original = JSON.parse(readFileSync(new URL(`${filename}.json`, directory), "utf8"));
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(fileURLToPath(new URL(`${filename}.enzitag`, directory)));
    await expect(
      page.getByTestId(family === "nonlinear" ? "saturation-result" : "mixed-advanced-summary"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as unknown as { budgetCalculations: number }).budgetCalculations,
      ),
    ).toBe(0);
    let alert: Locator;
    if (family === "nonlinear") {
      const tool = await openSaturationTool(page);
      await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
      alert = tool.getByRole("alert");
      await expect(alert).toContainText(/4\.?096 pares/);
    } else {
      // Historical API fixtures deliberately have no selected entry path.
      // Choose it through the UI before asking to configure a new analysis.
      await page.getByRole("button", { name: /^Objetivo/ }).click();
      await startObjective(page, "analyze");
      await page.getByRole("button", { name: /^Análise/ }).click();
      await page
        .getByRole("combobox", { name: "Estrutura das observações", exact: true })
        .selectOption("repeated");
      await page.getByTestId("repeated-method").selectOption("mixed");
      await page
        .getByRole("checkbox", { name: "Usar inferência e covariâncias avançadas", exact: true })
        .check();
      await page.getByTestId("mixed-covariance").selectOption("unstructured");
      await page.getByTestId("mixed-time-effect").selectOption("categorical");
      await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
      alert = page.getByRole("alert");
      await expect(alert).toContainText("12 ocasiões");
    }
    await expect(alert).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    for (const width of [375, 1064, 1920]) {
      await page.setViewportSize({ width, height: 892 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      expect(
        await alert.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth + 1;
        }),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1064, height: 892 });
    await page.screenshot({
      path: info.outputPath(`${family}-refusal-focused.png`),
      fullPage: false,
    });
    expect(
      await page.evaluate(
        () => (window as unknown as { budgetCalculations: number }).budgetCalculations,
      ),
    ).toBe(1);
    if (family === "nonlinear")
      await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const path = info.outputPath(`${family}-preserved.enzitag`);
    await (await pending).saveAs(path);
    const data = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
    if (!data) throw new Error("Missing document");
    const saved = JSON.parse(strFromU8(data));
    const field = family === "nonlinear" ? "nonlinearResult" : "mixedModelResult";
    expect(saved.experiments[0][field].records).toEqual(original.experiments[0][field].records);
  });

test("AU-B09/P05: real worker refuses unsupported degree and oversized resources explicitly", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.waitForFunction(() =>
    Boolean((window as unknown as { budgetWorkerUrl: string }).budgetWorkerUrl),
  );
  const operation = {
    type: "modelFitLinear",
    dataset: {
      factors: [{ id: "x", name: "x", kind: "numeric", unit: null, levels: [] }],
      responses: [{ id: "y", name: "y", unit: null }],
      observations: [-2, -1, 0, 1, 2].map((x, i) => ({
        id: `o${i}`,
        unitId: null,
        factors: [x],
        responses: [[5.1, 1.9, 1.1, 2.05, 4.9][i]],
      })),
    },
    spec: {
      responseId: "y",
      intercept: true,
      terms: [{ type: "power", factorId: "x", degree: 2 }],
      coding: "treatment",
      confidenceLevel: 0.95,
    },
  };
  const quadratic = await actualWorker(page, operation);
  expect(quadratic.outcome.status).toBe("ok");
  operation.spec.terms[0]!.degree = 2147483648;
  const rejected = await actualWorker(page, operation);
  expect(rejected.outcome.status).toBe("error");
  expect(rejected.outcome.error.issues).toContainEqual(
    expect.objectContaining({ code: "model.invalid_power" }),
  );
  const results = [{ quadratic, rejected }];
  for (const input of inputs.filter((input: { expectedIssue?: string }) => input.expectedIssue)) {
    const response = await actualWorker(page, input.operation);
    expect(response.outcome.status).toBe("error");
    expect(response.outcome.error.issues).toContainEqual(
      expect.objectContaining({ code: input.expectedIssue }),
    );
    results.push(response);
  }
  await info.attach("actual-worker-budget-responses", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
});

test("AU-P05: unfinished 4096-row profile preserves fit, explicit warnings, themes, reports and stored result", async ({
  page,
}, info) => {
  // A matriz de temas e idiomas executa 12 varreduras axe e seis exportações.
  // O ajuste científico conserva seu limite separado de 90 s abaixo.
  test.setTimeout(360_000);
  const input = inputs.find((c: { name: string }) => c.name === "nonlinear-hill-4096");
  const tool = await setupProfile(page, { name: input.name, request: input.operation });
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  const result = page.getByTestId("saturation-result");
  await expect(result).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByTestId("saturation-warning").filter({ hasText: "atingiu o orçamento" }),
  ).toBeVisible();
  await expect(page.getByTestId("saturation-parameters").locator("tbody tr")).toHaveCount(3);
  await expect(result).toContainText(/4\.?096/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const path = info.outputPath("resource-limited-profile.enzitag");
  await (await download).saveAs(path);
  const bytes = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
  if (!bytes) throw new Error("Missing project document");
  const doc = JSON.parse(strFromU8(bytes));
  const record = doc.experiments[0].nonlinearResult.records.at(-1);
  expect(record.result.n).toBe(4096);
  expect(record.result.converged).toBe(true);
  expect(record.result.residuals).toHaveLength(4096);
  expect(
    record.result.profiles.some((p: { lowerStatus: string }) => p.lowerStatus === "resourceLimit"),
  ).toBe(true);
  for (const profile of record.result.profiles.filter(
    (p: { lowerStatus: string }) => p.lowerStatus === "resourceLimit",
  )) {
    expect(profile.lower.status).toBe("undefined");
    expect(profile.upper.status).toBe("undefined");
    expect(profile.unimodalInExaminedRange).toBe(false);
  }
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(path);
  await expect(result).toBeVisible();
  for (const language of ["pt-BR", "en"]) {
    await page.locator("header.app-header select").first().selectOption(language);
    await expect(page.getByTestId("profile-budget-note")).toHaveCount(1);
    for (const width of [375, 1064, 1920]) {
      await page.setViewportSize({ width, height: 892 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1200, height: 892 });
    for (const theme of THEME_LIST) {
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await result.screenshot({ path: info.outputPath(`budget-${language}-${theme}.png`) });
    }
    for (const [id, ext] of [
      ["report-button", "html"],
      ["report-pdf-button", "pdf"],
      ["report-docx-button", "docx"],
    ]) {
      const pending = page.waitForEvent("download");
      await page.getByTestId(id!).click();
      await (await pending).saveAs(info.outputPath(`budget-${language}.${ext}`));
    }
    const html = readFileSync(info.outputPath(`budget-${language}.html`), "utf8");
    expect(html).toContain(language === "en" ? "execution budget" : "orçamento de execução");
    expect(html).not.toMatch(
      /nonlinear\.profile_budget|profile\.status\.resourceLimit|NaN|Infinity|\{\{/,
    );
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await openSaturationTool(page);
  await tool.locator("details").filter({ hasText: "até 4.096 pares" }).locator("summary").click();
  await expect(tool.getByText(/até 4.096 pares/)).toBeVisible();
});
