import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openFigureMenu } from "./figureTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 }, acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as {
      scientificRequests: Array<Record<string, unknown>>;
      surfaceDelay: number;
    };
    host.scientificRequests = [];
    host.surfaceDelay = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const json = (message as { requestJson?: string }).requestJson;
      const operation = json ? JSON.parse(json).operation : null;
      if (operation) host.scientificRequests.push(operation);
      if (operation?.type === "surfaceAnalyze" && host.surfaceDelay) {
        setTimeout(() => Reflect.apply(original, this, [message, ...args]), host.surfaceDelay);
        return;
      }
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

async function begin(page: Page, names = ["X1", "X2"]) {
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [i, name] of names.entries()) {
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(names.length).fill("Rendimento");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  for (const name of names) {
    await page.getByLabel(`Limite baixo de ${name}`).fill("-1");
    await page.getByLabel(`Limite alto de ${name}`).fill("1");
  }
  if (names.length === 1)
    await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("linear");
  await page.getByLabel("Total de ensaios", { exact: true }).fill("4");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("2");
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("17");
  await page
    .getByLabel("Aleatorizar a ordem de execução dos ensaios novos", { exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByTestId("optimal-table").locator("tbody tr")).toHaveCount(4);
}

function projectDocument(path: string) {
  const bytes = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
  if (!bytes) throw new Error("project.json");
  return JSON.parse(strFromU8(bytes));
}

test("desenho antigo não é aplicado com outras opções; campos inválidos não viram zero", async ({
  page,
}, info) => {
  await begin(page);
  await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption("i");
  await page.screenshot({ path: info.outputPath("changed-design.png") });
  await expect(
    page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("optimal-stale")).toBeVisible();
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }),
  ).toBeEnabled();
  const count = await page.evaluate(
    () =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((request) => request.type === "designOptimalGenerate").length,
  );
  await page.getByRole("button", { name: "Adicionar restrição", exact: true }).click();
  await page.getByLabel("Restrição 1: coeficiente de X1", { exact: true }).fill("texto");
  await page.getByLabel("Restrição 1: limite", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Confira as faixas e as restrições");
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as { scientificRequests: Array<{ type: string }> }
        ).scientificRequests.filter((request) => request.type === "designOptimalGenerate").length,
    ),
  ).toBe(count);
});

test("faixas pequenas conservam os níveis do motor ao aplicar a matriz", async ({ page }, info) => {
  await begin(page);
  for (const name of ["X1", "X2"]) {
    await page.getByLabel(`Limite baixo de ${name}`).fill("-1e-12");
    await page.getByLabel(`Limite alto de ${name}`).fill("1e-12");
  }
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  const values = await page
    .getByRole("textbox", { name: /X[12] — Obs\./ })
    .evaluateAll((inputs) =>
      inputs.map((input) => Number((input as HTMLInputElement).value.replace(",", "."))),
    );
  await page.screenshot({ path: info.outputPath("small-scale-matrix.png") });
  expect(values.length).toBe(8);
  expect(values.every((value) => Math.abs(value) === 1e-12)).toBe(true);
});

test("ampliação do zero: dois blocos novos, ajuste com bloco, snapshot, arquivos e confirmação", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await begin(page);
  const initial = await page
    .getByTestId("optimal-table")
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll("td")]
          .slice(1, 3)
          .map((cell) => Number(cell.textContent?.replace(",", "."))),
      ),
    );
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  const truth = (x: number, y: number, i: number, offset = 0) =>
    5 + 2 * x - 3 * y - 0.5 * x * x + 0.25 * y * y + 1.25 * x * y + offset + 0.01 * Math.sin(i);
  for (const [i, point] of initial.entries())
    await page
      .getByLabel(`Rendimento — Obs. ${i + 1}`, { exact: true })
      .fill(String(truth(point[0] ?? 0, point[1] ?? 0, i)));
  await page.getByRole("checkbox", { name: /ensaios já realizados/ }).check();
  await page.getByRole("checkbox", { name: "Considerar blocos de execução", exact: true }).check();
  await page.getByLabel("Nome da coluna de bloco", { exact: true }).fill("Lote de execução");
  await page.getByLabel("Nome do bloco anterior", { exact: true }).fill("Dia 1");
  await page.getByLabel("Nome do bloco 1", { exact: true }).fill("Dia 2");
  await page.getByRole("button", { name: "Adicionar alocação de bloco", exact: true }).click();
  await page.getByLabel("Nome do bloco 2", { exact: true }).fill("Dia 3");
  await page.getByLabel("Ensaios novos 2", { exact: true }).fill("2");
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("quadratic");
  await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption("i");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("10");
  const configuration = page.getByTestId("optimal-block-options");
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="optimal-block-options"]').analyze())
      .violations,
  ).toEqual([]);
  await configuration.screenshot({ path: info.outputPath("block-allocation.png") });
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(
    await configuration
      .locator('input:not([type="checkbox"])')
      .evaluateAll((inputs) => inputs.every((input) => input.getBoundingClientRect().height >= 40)),
  ).toBe(true);
  await configuration.screenshot({ path: info.outputPath("block-allocation-mobile.png") });
  await page.setViewportSize({ width: 1064, height: 892 });
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const table = page.getByTestId("optimal-table");
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await expect(page.getByTestId("optimal-block-model")).toContainText("contrastes de soma zero");
  for (const extension of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: `Matriz ótima (${extension})`, exact: true }).click();
    const path = info.outputPath(`blocks-matrix.${extension.toLowerCase()}`);
    await (await pending).saveAs(path);
    const content =
      extension === "CSV"
        ? readFileSync(path, "utf8")
        : Object.values(unzipSync(new Uint8Array(readFileSync(path))))
            .map((bytes) => strFromU8(bytes))
            .join("\n");
    expect(content).toContain("Dia 3");
    expect(content).toContain("sum contrasts");
  }
  const runs = await table.locator("tbody tr").evaluateAll((rows) =>
    rows.map((row) => {
      const cells = [...row.querySelectorAll("td")];
      return {
        block: cells[1]?.textContent?.trim(),
        x: Number(cells[2]?.textContent?.replace(",", ".")),
        y: Number(cells[3]?.textContent?.replace(",", ".")),
      };
    }),
  );
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  for (const [i, run] of runs.entries())
    if (i >= 4)
      await page
        .getByLabel(`Rendimento — Obs. ${i + 1}`, { exact: true })
        .fill(String(truth(run.x, run.y, i, run.block === "Dia 2" ? 4 : -2)));
  await page.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Avaliações na distribuição", exact: true })
    .selectOption("2");
  await page.getByRole("combobox", { name: "Bloco no mapa", exact: true }).selectOption("2");
  await page.locator(".steps .step").nth(3).click();
  const blockOptions = page.getByTestId("surface-block-options");
  await expect(
    blockOptions.getByRole("combobox", { name: "Bloco para as previsões", exact: true }),
  ).toHaveValue("Dia 1");
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="surface-block-options"]').analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => {
    (window as unknown as { surfaceDelay: number }).surfaceDelay = 1500;
  });
  await page.getByRole("button", { name: "Calcular superfície", exact: true }).click();
  await blockOptions
    .getByRole("combobox", { name: "Bloco para as previsões", exact: true })
    .selectOption("Dia 3");
  await page.locator(".steps .step").nth(2).click();
  await page.getByLabel("Rendimento — Obs. 1", { exact: true }).fill("999");
  await expect(page.getByTestId("block-prediction-context").first()).toContainText("Dia 1");
  const raced = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const racedPath = info.outputPath("block-reference-race.enzitag");
  await (await raced).saveAs(racedPath);
  const racedDoc = projectDocument(racedPath).experiments[0],
    analysis = racedDoc.analyses.at(-1);
  expect(racedDoc.analysisSelection.surfaceBlock.reference).toBe("Dia 3");
  expect(analysis.options.surfaceBlock.reference).toBe("Dia 1");
  expect(analysis.result.block.context.reference).toBe("Dia 1");
  // Force a fresh figure request after editing the table: it must use the saved model data/reference.
  const view = page.getByTestId("surface-view");
  const previousGrids = await page.evaluate(
    () =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((request) => request.type === "surfaceGrid").length,
  );
  await view.getByRole("combobox").nth(2).selectOption("41");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { scientificRequests: Array<{ type: string }> }
          ).scientificRequests.filter((request) => request.type === "surfaceGrid").length,
      ),
    )
    .toBeGreaterThan(previousGrids);
  await expect(view).not.toHaveAttribute("data-loading", "true");
  const gridRequest = await page.evaluate(() =>
    (
      window as unknown as {
        scientificRequests: Array<{
          type: string;
          fitted?: { coefficients: unknown[]; block?: { reference: string } };
          surface?: {
            block?: { reference: string };
            dataset: { observations: Array<{ responses: number[] }> };
          };
        }>;
      }
    ).scientificRequests
      .filter((request) => request.type === "surfaceGrid")
      .at(-1),
  );
  expect(gridRequest?.surface?.block?.reference).toBe("Dia 1");
  expect(gridRequest?.fitted?.block?.reference).toBe("Dia 1");
  expect(gridRequest?.fitted?.coefficients).toEqual(analysis.result.fit.coefficients);
  expect(gridRequest?.surface?.dataset.observations[0]?.responses[0]).not.toBe(999);
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByLabel("Rendimento — Obs. 1", { exact: true })
    .fill(String(truth(initial[0]?.[0] ?? 0, initial[0]?.[1] ?? 0, 0)));
  await page.locator(".steps .step").nth(3).click();
  await page.evaluate(() => {
    (window as unknown as { surfaceDelay: number }).surfaceDelay = 0;
  });
  await page.getByRole("button", { name: "Calcular superfície", exact: true }).click();
  await expect(page.getByTestId("block-prediction-context").first()).toContainText("Dia 3");
  await expect(page.getByTestId("surface-view")).not.toHaveAttribute("data-loading", "true");
  for (const theme of THEME_LIST) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    for (const lang of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(lang);
      for (const width of [375, 1064]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [1, 2]) {
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${16 * scale}px`;
          }, scale);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${theme}/${lang}/${width}/${scale}`,
          ).toBe(true);
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      await view.screenshot({ path: info.outputPath(`block-surface-${theme}-${lang}.png`) });
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.getByRole("button", { name: "Buscar condições ótimas", exact: true }).click();
  await expect(page.getByTestId("candidate-table").first()).toBeVisible();
  await expect(
    page.getByTestId("optimization-result").getByTestId("block-prediction-context"),
  ).toContainText("Dia 3");
  for (const [control, extension] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    if (!control || !extension) throw new Error("control");
    const pending = page.waitForEvent("download", { timeout: 20000 });
    await page.getByTestId(control).click();
    const reportPath = info.outputPath(`blocks-report.${extension}`);
    await (await pending).saveAs(reportPath);
    if (extension === "html") {
      const html = readFileSync(reportPath, "utf8");
      expect(html).not.toContain("Escolha dois fatores para os eixos");
      expect(html).not.toContain("Será analisada");
      expect(html).toContain('data-testid="surface-chart"');
      expect(html).toContain('data-testid="optimal-variance-report"');
      expect(html).toContain('data-testid="optimal-variance-spatial"');
    }
  }
  for (const extension of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Malha de predições (${extension})`, exact: true })
      .click();
    const path = info.outputPath(`blocks-grid.${extension.toLowerCase()}`);
    await (await pending).saveAs(path);
    const content =
      extension === "CSV"
        ? readFileSync(path, "utf8")
        : Object.values(unzipSync(new Uint8Array(readFileSync(path))))
            .map((bytes) => strFromU8(bytes))
            .join("\n");
    expect(content).toContain("Dia 3");
  }
  const figure = page.getByTestId("contour-chart");
  await openFigureMenu(figure);
  const svg = page.waitForEvent("download", { timeout: 20000 });
  await figure.getByRole("button", { name: /Figura — SVG/ }).click();
  await (await svg).saveAs(info.outputPath("block-surface.svg"));
  expect(readFileSync(info.outputPath("block-surface.svg"), "utf8")).toContain("Dia 3");
  const saved = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const archive = info.outputPath("blocks.enzitag");
  await (await saved).saveAs(archive);
  const project = projectDocument(archive),
    records = project.experiments[0].optimalDesigns;
  expect(records).toHaveLength(2);
  expect(records[1].result.spec.blocks.labels).toEqual(["Dia 1", "Dia 2", "Dia 3"]);
  const references = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../../validation/cases/optimal_design/blocked.json", import.meta.url),
      ),
      "utf8",
    ),
  );
  const reference = references.cases.find(
    (c: { name: string }) => c.name === "two-new-blocks-quadratic-i",
  );
  expect(records[1].result.metrics.iAverage).toBeCloseTo(reference.metrics.iAverage, 8);
  await page.getByRole("button", { name: "Propor ensaios de confirmação", exact: true }).click();
  await expect(page.getByTestId("confirmation-check")).toBeVisible();
  await expect(
    page.getByTestId("confirmation-check").getByTestId("block-prediction-context"),
  ).toContainText("Dia 3");
  const confirmation = page.waitForEvent("download", { timeout: 20000 });
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const confirmationPath = info.outputPath("blocks-confirmation.enzitag");
  await (await confirmation).saveAs(confirmationPath);
  const child = projectDocument(confirmationPath).experiments[1];
  expect(child.confirmation.block.reference).toBe("Dia 3");
  expect(
    child.revisions
      .at(-1)
      .data.rows.every(
        (row: { factors: string[] }) => row.factors.length === 3 && row.factors[2] === "Dia 3",
      ),
  ).toBe(true);
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(archive);
  await expect(page.getByTestId("block-prediction-context").first()).toContainText("Dia 3");
  await expect(page.getByTestId("contour-chart")).toBeVisible();
  const archived = project.experiments[0].analyses
    .filter((record: { result: { type: string } }) => record.result.type === "responseSurface")
    .at(-1);
  expect(archived).toBeDefined();
  const reopenedGrid = await page.evaluate(() =>
    (
      window as unknown as {
        scientificRequests: Array<{
          type: string;
          fitted?: { coefficients: unknown[]; block?: { reference: string } };
        }>;
      }
    ).scientificRequests
      .filter((request) => request.type === "surfaceGrid")
      .at(-1),
  );
  expect(reopenedGrid?.fitted?.coefficients).toEqual(archived.result.fit.coefficients);
  expect(reopenedGrid?.fitted?.block?.reference).toBe("Dia 3");
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((request) =>
        [
          "surfaceAnalyze",
          "surfaceSelectModel",
          "designOptimalGenerate",
          "optimizationRun",
        ].includes(request.type),
      ),
    ),
  ).toEqual([]);
});

test("um fator: ampliação quadrática com bloco, predição condicional e arquivo", async ({
  page,
}, info) => {
  await begin(page, ["X1"]);
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  for (let i = 1; i <= 4; i++) {
    const x = Number(await page.getByLabel(`X1 — Obs. ${i}`, { exact: true }).inputValue());
    await page
      .getByLabel(`Rendimento — Obs. ${i}`, { exact: true })
      .fill(String(5 + 2 * x - 0.5 * x * x + 0.01 * Math.sin(i)));
  }
  await page.getByRole("checkbox", { name: /ensaios já realizados/ }).check();
  await page.getByRole("checkbox", { name: "Considerar blocos de execução", exact: true }).check();
  await page.getByLabel("Nome do bloco anterior", { exact: true }).fill("Antes");
  await page.getByLabel("Nome do bloco 1", { exact: true }).fill("Ampliação");
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("quadratic");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByTestId("optimal-table").locator("tbody tr")).toHaveCount(8);
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  for (let i = 5; i <= 8; i++) {
    const x = Number(await page.getByLabel(`X1 — Obs. ${i}`, { exact: true }).inputValue());
    await page
      .getByLabel(`Rendimento — Obs. ${i}`, { exact: true })
      .fill(String(9 + 2 * x - 0.5 * x * x + 0.01 * Math.sin(i)));
  }
  await page.locator(".steps .step").nth(3).click();
  await page
    .getByRole("combobox", { name: "Bloco para as previsões", exact: true })
    .selectOption("Ampliação");
  await page.getByRole("button", { name: "Calcular superfície", exact: true }).click();
  await expect(page.getByTestId("block-prediction-context").first()).toContainText("Ampliação");
  await expect(
    page.getByText("O ajuste de um fator está nas tabelas e na equação.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("contour-chart")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("one-factor-block-results.png"), fullPage: true });
  await page.getByRole("button", { name: "Buscar condições ótimas", exact: true }).click();
  await expect(page.getByTestId("candidate-table").first()).toBeVisible();
  await expect(
    page.getByTestId("optimization-result").getByTestId("block-prediction-context"),
  ).toContainText("Ampliação");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const archive = info.outputPath("one-factor-block.enzitag");
  await (await pending).saveAs(archive);
  const doc = projectDocument(archive).experiments[0];
  expect(doc.analyses.at(-1).result.block.reference).toBe("Ampliação");
  expect(
    doc.analyses.find((a: { methodId: string }) => a.methodId === "response_surface").result.ranges,
  ).toHaveLength(1);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((r) => r.type === "surfaceGrid"),
    ),
  ).toEqual([]);
});

test("protótipo com perda de precisão abre com aviso e sem nova busca", async ({ page }, info) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL(
        "../../../../validation/cases/et25/b08-blocks-fixtures/legacy-small-scale.enzitag",
        import.meta.url,
      ),
    ),
  );
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  await expect(page.getByTestId("optimal-historical-precision")).toBeVisible();
  await page
    .getByTestId("optimal-historical-precision")
    .screenshot({ path: info.outputPath("historical-precision-warning.png") });
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((r) => r.type === "designOptimalGenerate"),
    ),
  ).toEqual([]);
});
