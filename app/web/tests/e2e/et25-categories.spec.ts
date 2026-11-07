import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { parseHTML } from "linkedom";
import { openFigureMenu } from "./figureTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 }, acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { scientificRequests: Array<{ type: string }> };
    host.scientificRequests = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const json = (message as { requestJson?: string }).requestJson;
      if (json) host.scientificRequests.push(JSON.parse(json).operation);
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

async function begin(page: Page, numeric = true, custom?: [string, string, string][]) {
  await page.goto("/");
  await startObjective(page, "plan");
  const factors =
    custom ??
    (numeric
      ? [
          ["X", "numeric", ""],
          ["Condição", "categorical", "A;B"],
        ]
      : [
          ["Condição", "categorical", "A;B"],
          ["Meio", "categorical", "P;Q;R"],
        ]);
  for (const [i, factor] of factors.entries()) {
    const [name, kind, levels] = factor;
    if (!name || !kind) throw new Error("factor");
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo", { exact: true }).nth(i).selectOption(kind);
    if (kind === "categorical")
      await page
        .getByLabel("Níveis (opcional)")
        .last()
        .fill(levels ?? "");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(factors.length).fill("Atividade");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  for (const [name, kind] of factors) {
    if (kind === "numeric") {
      await page.getByLabel(`Limite baixo de ${name}`, { exact: true }).fill("-1");
      await page.getByLabel(`Limite alto de ${name}`, { exact: true }).fill("1");
    }
  }
  await page.getByLabel("Total de ensaios", { exact: true }).fill("6");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("4");
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("17");
  await page.getByRole("checkbox", { name: /Aleatorizar a ordem/ }).uncheck();
}

async function searchAndApply(page: Page) {
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByTestId("optimal-categorical-model")).toBeVisible();
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
}

async function fillResponse(page: Page, start: number, end: number) {
  for (let i = start; i <= end; i++) {
    const x = Number(
      (await page.getByLabel(`X — Obs. ${i}`, { exact: true }).inputValue()).replace(",", "."),
    );
    const category = await page.getByLabel(`Condição — Obs. ${i}`, { exact: true }).inputValue();
    expect(["A", "B"]).toContain(category);
    const c = category === "A" ? 1 : -1;
    await page
      .getByLabel(`Atividade — Obs. ${i}`, { exact: true })
      .fill(String(5 + 2 * x + 3 * c + 1.5 * x * c + 0.05 * ((i % 3) - 1) + (start > 1 ? 2 : 0)));
  }
}

async function save(page: Page, path: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  await (await pending).saveAs(path);
  const json = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
  if (!json) throw new Error("project.json");
  return JSON.parse(strFromU8(json));
}

test("modelo misto do zero: categorias na grade, precisão, ajuste completo, arquivos e temas", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await begin(page);
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("interactions");
  await page
    .getByTestId("optimal-category-options")
    .screenshot({ path: info.outputPath("category-options.png") });
  await searchAndApply(page);
  await page.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await expect(page.getByLabel("Combinação categórica da figura espacial")).toHaveCount(1);
  await page
    .getByLabel("Combinação categórica da figura espacial")
    .selectOption({ label: "Condição: B" });
  await expect(page.getByTestId("optimal-variance-spatial")).toContainText("Condição: B");
  await page
    .getByTestId("optimal-variance-panel")
    .screenshot({ path: info.outputPath("category-variance.png") });
  await fillResponse(page, 1, 6);
  await page
    .getByTestId("optimal-table")
    .screenshot({ path: info.outputPath("category-matrix.png") });
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Analisar modelo do ótimo", exact: true }),
  ).toBeEnabled();
  const alpha = page.getByLabel(/significância/).first();
  await alpha.fill("2");
  await expect(
    page.getByRole("button", { name: "Analisar modelo do ótimo", exact: true }),
  ).toBeDisabled();
  await expect(alpha).toHaveAttribute("aria-invalid", "true");
  await alpha.fill("0.05");
  await page.getByRole("button", { name: "Analisar modelo do ótimo", exact: true }).click();
  const summary = page.getByTestId("optimal-model-summary");
  await expect(summary).toContainText("posto 4 de 4");
  const coefficients = page.getByTestId("optimal-model-coefficients");
  await expect(coefficients).toContainText("Condição[A]");
  await expect(coefficients).toContainText("z1(X) × Condição[A]");
  expect((await new AxeBuilder({ page }).include("#main").analyze()).violations).toEqual([]);
  for (const theme of THEME_LIST) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    for (const language of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(language);
      for (const width of [375, 1064]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [1, 2]) {
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${16 * scale}px`;
          }, scale);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          ).toBe(true);
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      await page.setViewportSize({ width: 1064, height: 892 });
      await coefficients.screenshot({
        path: info.outputPath(`mixed-model-${theme}-${language}.png`),
      });
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.locator("header.app-header select").nth(1).selectOption("professional");
  for (const extension of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Coeficientes e incerteza (${extension})`, exact: true })
      .click();
    await (await pending).saveAs(info.outputPath(`mixed-coefficients.${extension.toLowerCase()}`));
  }
  const figure = page.getByTestId("optimal-model-fit");
  await openFigureMenu(figure);
  const svg = page.waitForEvent("download");
  await figure.getByRole("button", { name: /Figura — SVG/ }).click();
  await (await svg).saveAs(info.outputPath("mixed-fit.svg"));
  for (const [control, extension] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ] as const) {
    const pending = page.waitForEvent("download");
    await page.getByTestId(control).click();
    const reportPath = info.outputPath(`mixed-report.${extension}`);
    await (await pending).saveAs(reportPath);
    if (extension === "html") {
      const { document } = parseHTML(readFileSync(reportPath, "utf8"));
      expect(document.body.textContent).toContain("A resposta Atividade foi analisada");
      expect(document.body.textContent).not.toContain("Será analisada");
      expect(
        document.querySelectorAll('[data-testid="optimal-model-observations"] tbody tr'),
      ).toHaveLength(6);
      expect(
        [...document.querySelectorAll("h2, h3")].filter(
          (title) => title.textContent === "Modelo do planejamento ótimo",
        ),
      ).toHaveLength(1);
      const profileReport = document.querySelector('[data-testid="optimal-variance-report"]');
      expect(profileReport?.querySelectorAll("tbody tr")).toHaveLength(1);
      expect(profileReport?.querySelector('[data-testid="optimal-variance-fds"] svg')).toBeTruthy();
      expect(
        profileReport?.querySelector('[data-testid="optimal-variance-spatial"]')?.textContent,
      ).toContain("Condição: B");
    }
  }
  const archive = info.outputPath("mixed-optimal.enzitag");
  const doc = await save(page, archive);
  const exp = doc.experiments[0];
  expect(exp.optimalDesigns[0].result.spec.categories.factors[0].levels).toEqual(["A", "B"]);
  expect(exp.optimalVariances[0].result.request.runCategories).toHaveLength(6);
  expect(exp.optimalVariances[0].view.categorySlice).toEqual(["B"]);
  expect(exp.analyses.at(-1).result.type).toBe("optimalModel");
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(archive);
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  await expect(page.getByTestId("optimal-variance-spatial")).toContainText("Condição: B");
  await page.locator(".steps .step").nth(4).click();
  await expect(summary).toContainText("posto 4 de 4");
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((r) =>
        ["designOptimalGenerate", "designOptimalAnalyze", "designOptimalVariance"].includes(r.type),
      ),
    ),
  ).toEqual([]);
});

test("somente categorias e combinações permitidas: singularidade explícita e matriz completa", async ({
  page,
}, info) => {
  await begin(page, false);
  await expect(
    page.getByTestId("design-mode").getByRole("radio", { name: /Ótimo D\/I/ }),
  ).toHaveAccessibleName(/Compatível com os fatores atuais/);
  const options = page.getByTestId("optimal-category-options");
  await options
    .getByRole("checkbox", { name: "Usar somente combinações categóricas permitidas" })
    .check();
  for (const [a, b] of [
    ["A", "P"],
    ["A", "Q"],
    ["B", "Q"],
    ["B", "R"],
  ] as const) {
    await options.getByRole("combobox", { name: "Condição", exact: true }).selectOption(a);
    await options.getByRole("combobox", { name: "Meio", exact: true }).selectOption(b);
    await options
      .getByRole("button", { name: "Adicionar combinação permitida", exact: true })
      .click();
  }
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("interactions");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("optimal-table")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("linear");
  await searchAndApply(page);
  await expect(page.getByTestId("optimal-summary")).toContainText("4 candidatos");
  await page.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await expect(page.getByTestId("optimal-variance-spatial")).toHaveCount(0);
  await expect(page.getByTestId("optimal-variance-panel")).toContainText("apenas categorias");
  await page
    .getByTestId("optimal-category-options")
    .screenshot({ path: info.outputPath("permitted-tuples.png") });
  const doc = await save(page, info.outputPath("nominal-only.enzitag"));
  for (const run of doc.experiments[0].optimalDesigns[0].result.runs)
    expect([
      ["A", "P"],
      ["A", "Q"],
      ["B", "Q"],
      ["B", "R"],
    ]).toContainEqual(run.categories);
});

test("ampliação mista em blocos mantém categorias, respostas antigas e modelo aditivo do bloco", async ({
  page,
}, info) => {
  test.setTimeout(150_000);
  await begin(page);
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Planejamento ótimo em dois lotes");
  await searchAndApply(page);
  await page.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await fillResponse(page, 1, 6);
  const oldValues = await page
    .getByRole("textbox", { name: /Atividade — Obs\./ })
    .evaluateAll((elements) => elements.map((e) => (e as HTMLInputElement).value));
  await page.getByRole("checkbox", { name: /ensaios já realizados/ }).check();
  await page.getByRole("checkbox", { name: "Considerar blocos de execução", exact: true }).check();
  await page.getByLabel("Nome da coluna de bloco", { exact: true }).fill("Lote");
  await page.getByLabel("Nome do bloco anterior", { exact: true }).fill("Antes");
  await page.getByLabel("Nome do bloco 1", { exact: true }).fill("Depois");
  await searchAndApply(page);
  for (let i = 1; i <= 6; i++)
    await expect(page.getByLabel(`Atividade — Obs. ${i}`, { exact: true })).toHaveValue(
      oldValues[i - 1] ?? "",
    );
  await fillResponse(page, 7, 10);
  await page.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Avaliações na distribuição", exact: true })
    .selectOption("1");
  await page.getByRole("combobox", { name: "Bloco no mapa", exact: true }).selectOption("1");
  await page
    .getByLabel("Combinação categórica da figura espacial")
    .selectOption({ label: "Condição: B" });
  const designs = page.getByRole("combobox", { name: "Consultar planejamento salvo" });
  const archivedOption = await designs.locator("option").nth(1).getAttribute("value");
  expect(archivedOption).toBeTruthy();
  await designs.selectOption(archivedOption as string);
  await expect(page.getByTestId("optimal-archive-context")).toBeVisible();
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByRole("button", { name: "Analisar modelo do ótimo", exact: true }).click();
  await expect(page.getByTestId("optimal-model-summary")).toContainText("posto 5 de 5");
  await expect(page.getByTestId("optimal-model-coefficients")).toContainText("Block[Antes]");
  const doc = await save(page, info.outputPath("mixed-augmentation.enzitag"));
  const experiment = doc.experiments[0];
  expect(experiment.optimalDesigns).toHaveLength(2);
  expect(experiment.optimalVariances).toHaveLength(2);
  const [firstDesign, lastDesign] = experiment.optimalDesigns;
  const [firstProfile, lastProfile] = experiment.optimalVariances;
  expect(experiment.analysisSelection.optimalDesignId).toBe(lastDesign.id);
  expect(experiment.optimalArtifactSelection.designId).toBe(firstDesign.id);
  expect(
    doc.experiments[0].optimalDesigns[1].result.runs.filter((r: { fixed: boolean }) => r.fixed),
  ).toHaveLength(6);
  for (const [control, extension] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ] as const) {
    const pending = page.waitForEvent("download");
    await page.getByTestId(control).click();
    const path = info.outputPath(`mixed-augmentation-report.${extension}`);
    await (await pending).saveAs(path);
    if (extension === "html") {
      const { document } = parseHTML(readFileSync(path, "utf8"));
      const section = document.querySelector('[data-testid="optimal-variance-report"]');
      expect(section?.textContent).toContain(
        `Planejamento ${lastDesign.id} · perfil ${lastProfile.id}`,
      );
      expect(section?.textContent).not.toContain(`perfil ${firstProfile.id}`);
      expect(section?.querySelectorAll("tbody tr")).toHaveLength(3);
      expect(
        section?.querySelector('[data-testid="optimal-variance-spatial"]')?.textContent,
      ).toContain("Depois");
    }
  }
});

test("orçamento da busca mista preserva o desenho e registra os inícios de fato tentados", async ({
  page,
}, info) => {
  await begin(page, true, [
    ["X1", "numeric", ""],
    ["X2", "numeric", ""],
    ["X3", "numeric", ""],
    ["Condição", "categorical", "A;B;C"],
    ["Meio", "categorical", "P;Q;R;S"],
  ]);
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("quadratic");
  await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption("i");
  await page
    .getByRole("combobox", { name: "Níveis por fator na malha", exact: true })
    .selectOption("5");
  await page.getByLabel("Total de ensaios", { exact: true }).fill("60");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("5");
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const result = page.getByTestId("optimal-result");
  const budget = result.getByText(/orçamento de cálculo encerrou a busca após [1-4] de 5 inícios/);
  await expect(budget).toBeVisible({ timeout: 35_000 });
  await expect(result.getByText(/pode haver uma troca que melhore o critério/)).toHaveCount(1);
  await expect(result.getByTestId("optimal-table").locator("tbody tr")).toHaveCount(60);
  await budget.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("orcamento-do-otimo.png") });
  await page.locator("header.app-header select").first().selectOption("en");
  await expect(
    result.getByText(/work budget ended the search after [1-4] of 5 starts/),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 892 });
  await result.getByText(/work budget ended the search/).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(376);
  await page.screenshot({ path: info.outputPath("optimal-budget-en-375.png") });
  await page.setViewportSize({ width: 1064, height: 892 });
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  const matrix = page.waitForEvent("download");
  await result.getByRole("button", { name: "Matriz ótima (CSV)", exact: true }).click();
  const csv = info.outputPath("matriz-limitada.csv");
  await (await matrix).saveAs(csv);
  expect(readFileSync(csv, "utf8")).toContain("# startsRequested: 5");
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();

  const archive = info.outputPath("otimo-limitado.enzitag");
  const document = await save(page, archive);
  const saved = document.experiments[0].optimalDesigns[0].result;
  expect(saved.search.workLimit).toBeGreaterThan(0);
  expect(readFileSync(csv, "utf8")).toContain(
    `# workLimitMillionProducts: ${saved.search.workLimit}`,
  );
  expect(saved.search.startsAttempted).toBe(saved.startsRun);
  expect(saved.search.startsSucceeded + saved.search.startsFailed).toBe(saved.startsRun);
  expect(saved.startsRun).toBeLessThan(saved.spec.starts);
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(archive);
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  await expect(budget).toBeVisible();
  const reopened = await save(page, info.outputPath("otimo-limitado-reaberto.enzitag"));
  expect(reopened.experiments[0].optimalDesigns[0].result).toEqual(saved);
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((request) => request.type === "designOptimalGenerate"),
    ),
  ).toEqual([]);
});
