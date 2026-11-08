import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openFigureMenu } from "./figureTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 }, acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { mixtureFits: number };
    host.mixtureFits = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = message as { requestJson?: string };
      if (data.requestJson && JSON.parse(data.requestJson).operation.type === "mixtureAnalyze")
        host.mixtureFits++;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

function project(path: string) {
  const bytes = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
  if (!bytes) throw new Error("project.json");
  return JSON.parse(strFromU8(bytes));
}

test("simplex do zero: duas respostas, dados ausentes, campos inválidos, relatórios e arquivo", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page
    .getByLabel("Nome do projeto", { exact: true })
    .fill("Mistura de solventes com limites");
  await startObjective(page, "plan");
  for (const [i, name] of ["Água", "Etanol", "Glicerol"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  for (const [i, name] of ["Rendimento", "Pureza"].entries()) {
    await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
    await page
      .getByLabel("Nome", { exact: true })
      .nth(3 + i)
      .fill(name);
  }
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Misturas/ })
    .check();
  await page
    .getByTestId("mixture-panel")
    .getByRole("combobox")
    .first()
    .selectOption("extremeVertices");
  for (const name of ["Água", "Etanol", "Glicerol"])
    await page.getByLabel(`Limite superior de ${name}`, { exact: true }).fill("0,6");
  await page.getByLabel("Pontos centrais extras", { exact: true }).fill("1");
  await page.getByLabel("Aleatorizar a ordem de execução", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Gerar planejamento", exact: true }).click();
  const table = page.getByTestId("mixture-table");
  await expect(table.locator("tbody tr")).toHaveCount(25);
  const points = await table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) =>
        [...row.querySelectorAll("td")]
          .slice(1, 4)
          .map((cell) => Number(cell.textContent?.replace(",", "."))),
      ),
    );
  for (const [i, [a = 0, b = 0, c = 0]] of points.entries()) {
    const y = 10 * a + 20 * b + 30 * c + 8 * a * b + 0.002 * (i % 3);
    await page.getByLabel(`Rendimento — Obs. ${i + 1}`, { exact: true }).fill(String(y));
    if (i !== 4)
      await page.getByLabel(`Pureza — Obs. ${i + 1}`, { exact: true }).fill(String(40 - y));
  }
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  const cox = page.getByTestId("cox-reference");
  await cox
    .getByRole("checkbox", { name: "Incluir traço de Cox no resultado", exact: true })
    .check();
  for (const [i, reference] of ["0,2", "0,3", "0,5"].entries())
    await cox.getByRole("textbox").nth(i).fill(reference);
  await page
    .getByRole("checkbox", { name: "Incluir otimização por desejabilidade", exact: true })
    .check();
  const options = page.getByTestId("mixture-optimization-options");
  await options
    .getByRole("checkbox", { name: "Pureza — incluir na otimização", exact: true })
    .check();
  for (const name of ["Rendimento", "Pureza"]) {
    await options.getByLabel(`${name} — Menor valor aceitável`, { exact: true }).fill("0");
    await options.getByLabel(`${name} — Alvo`, { exact: true }).fill("40");
  }
  await options.getByLabel("Rendimento — Alvo", { exact: true }).fill("inválido");
  await page
    .getByRole("button", { name: "Ajustar modelos e otimizar a mistura", exact: true })
    .click();
  await expect(options.getByLabel("Rendimento — Alvo", { exact: true })).toBeFocused();
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
  await options.getByLabel("Rendimento — Alvo", { exact: true }).fill("40");
  await page
    .getByTestId("mixture-optimization-config")
    .screenshot({ path: info.outputPath("simplex-options.png") });
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-testid="mixture-optimization-config"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page
    .getByTestId("mixture-optimization-config")
    .screenshot({ path: info.outputPath("simplex-options-mobile.png") });
  await page.setViewportSize({ width: 1064, height: 892 });
  await page
    .getByRole("button", { name: "Ajustar modelos e otimizar a mistura", exact: true })
    .click();
  await expect(page.getByTestId("mixture-optimum-summary")).toBeVisible();
  const result = page.getByTestId("mixture-optimum-results");
  await expect(result).toBeVisible();
  await expect(result.getByTestId("mixture-optimum-work")).toContainText("40 de 40");
  await expect(page.getByTestId("ternary-plot").locator("[data-mixture-optimum]")).toHaveCount(1);
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="mixture-optimum-results"]').analyze())
      .violations,
  ).toEqual([]);
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
            `${theme}/${language}/${width}/${scale}`,
          ).toBe(true);
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      await result.screenshot({ path: info.outputPath(`simplex-${theme}-${language}.png`) });
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  const candidates = page.getByTestId("mixture-optimum-candidates");
  for (const ext of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await candidates
      .getByRole("button", { name: `Candidatos de mistura (${ext})`, exact: true })
      .click();
    await (await pending).saveAs(info.outputPath(`simplex-candidates.${ext.toLowerCase()}`));
  }
  const figure = page.getByTestId("ternary-plot");
  await figure.screenshot({ path: info.outputPath("simplex-highlight.png") });
  await openFigureMenu(figure);
  const svg = page.waitForEvent("download");
  await figure.getByRole("button", { name: /Figura — SVG/ }).click();
  await (await svg).saveAs(info.outputPath("simplex.svg"));
  for (const [id, ext] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    if (!id || !ext) throw new Error("control");
    const pending = page.waitForEvent("download");
    await page.getByTestId(id).click();
    await (await pending).saveAs(info.outputPath(`simplex-report.${ext}`));
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const archive = info.outputPath("simplex.enzitag");
  await (await pending).saveAs(archive);
  const saved = project(archive),
    record = saved.experiments[0].mixtureResult.records[0];
  expect(
    record.input.request.optimization.data.map(
      (data: { response: number[] }) => data.response.length,
    ),
  ).toEqual([25, 24]);
  const optimum = record.result.optimum;
  expect(record.input.request.coxReference).toEqual([0.2, 0.3, 0.5]);
  expect(record.result.coxTrace).toBeDefined();
  expect(optimum.algorithm).toBe("pair-transfer-pattern/2");
  expect(optimum.evaluations).toBeLessThan(60000);
  expect(optimum.candidates[0].desirability).toBeCloseTo(0.5, 3);
  expect(
    optimum.candidates.every(
      (candidate: { proportions: number[] }) =>
        Math.abs(candidate.proportions.reduce((sum, x) => sum + x, 0) - 1) < 1e-9 &&
        candidate.proportions.every((x) => x >= 0 && x <= 0.6 + 1e-10),
    ),
  ).toBe(true);
  const html = readFileSync(info.outputPath("simplex-report.html"), "utf8");
  expect(html).toContain("Previsões em todos os candidatos");
  const predictionRows = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, "text/html");
    return document.querySelectorAll('[data-testid="mixture-optimum-predictions"] tbody tr').length;
  }, html);
  expect(predictionRows).toBe(
    optimum.candidates.reduce(
      (sum: number, candidate: { predictions: unknown[] }) => sum + candidate.predictions.length,
      0,
    ),
  );
  expect(html).not.toContain("Ajustar modelos e otimizar");
  await page.reload();
  let chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(archive);
  await expect(result).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
  await page.locator(".steps .step").nth(3).click();
  await options.getByLabel("Rendimento — Alvo", { exact: true }).fill("inválido");
  await expect(page.getByTestId("mixture-analysis").getByRole("status")).toContainText("mudaram");
  const editedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const edited = info.outputPath("simplex-invalid-draft.enzitag");
  await (await editedDownload).saveAs(edited);
  const editedDoc = project(edited).experiments[0];
  expect(editedDoc.mixtureResult.selection.optimization.responses[0].target).toBe("inválido");
  expect(
    editedDoc.mixtureResult.records[0].input.request.optimization.setup.responses[0].goal.target,
  ).toBe(40);
  await page.reload();
  chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(edited);
  await page.locator(".steps .step").nth(3).click();
  await expect(options.getByLabel("Rendimento — Alvo", { exact: true })).toHaveValue("inválido");
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
  await page.locator(".steps .step").nth(1).click();
  await page
    .getByRole("group", { name: "Resposta 2 — Pureza", exact: true })
    .getByRole("button", { name: "Remover", exact: true })
    .click();
  await page.locator(".steps .step").nth(3).click();
  const removed = options.locator(".notice").filter({ hasText: "foi removida do experimento" });
  await expect(removed).toBeVisible();
  await removed.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(removed).toHaveCount(0);
});

test("simplex salvo: 2–8 componentes, relatórios, região pontual e objetivo inviável sem buscar de novo", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  for (const index of [0, 2, 7, 8, 10, 13]) {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    const archive = fileURLToPath(
      new URL(
        `../../../../validation/cases/et25/b08-simplex-fixtures/simplex-${index}.enzitag`,
        import.meta.url,
      ),
    );
    await (await chooser).setFiles(archive);
    await page.locator(".steps .step").nth(4).click();
    const result = page.getByTestId("mixture-optimum-results");
    await expect(result).toBeVisible();
    await result.screenshot({ path: info.outputPath(`simplex-case-${index}.png`) });
    if (index === 10)
      await expect(page.getByTestId("mixture-optimum-candidates").locator("tbody tr")).toHaveCount(
        0,
      );
    if (index === 8) await expect(result).toContainText("única composição");
    if (index === 10)
      await expect(result.getByTestId("mixture-optimum-status")).toContainText(
        "A busca não encontrou candidato",
      );
    if (index === 13)
      await expect(result.getByTestId("mixture-optimum-status")).toContainText(
        "Isso não demonstra",
      );
    if (index === 2 || index === 7) {
      const experiment = project(archive).experiments[0];
      const saved = experiment.mixtureResult.records[0].result.optimum.candidates;
      for (const [control, extension] of [
        ["report-button", "html"],
        ["report-pdf-button", "pdf"],
        ["report-docx-button", "docx"],
      ] as const) {
        const pending = page.waitForEvent("download");
        await page.getByTestId(control).click();
        const path = info.outputPath(`simplex-case-${index}.${extension}`);
        await (await pending).saveAs(path);
        if (extension === "html") {
          const content = await page.evaluate(
            (html) => {
              const report = new DOMParser().parseFromString(html, "text/html");
              const candidates = report.querySelector('[data-testid="mixture-optimum-candidates"]');
              return {
                headers: Array.from(
                  candidates?.querySelectorAll("thead th") ?? [],
                  (h) => h.textContent,
                ),
                candidates: candidates?.querySelectorAll("tbody tr").length,
                predictions: report.querySelectorAll(
                  '[data-testid="mixture-optimum-predictions"] tbody tr',
                ).length,
              };
            },
            readFileSync(path, "utf8"),
          );
          const factors = experiment.revisions
            .at(-1)
            .data.factors.map((f: { name: string }) => f.name);
          expect(content.headers).toEqual(expect.arrayContaining(factors));
          expect(content.candidates).toBe(saved.length);
          expect(content.predictions).toBe(
            saved.reduce(
              (sum: number, c: { predictions: unknown[] }) => sum + c.predictions.length,
              0,
            ),
          );
        }
      }
    }
    expect(
      await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
    ).toBe(0);
  }
});
