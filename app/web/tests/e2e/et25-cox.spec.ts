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

test("Cox do zero: referência, caminhos limitados, figura, arquivos e revisão", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [i, name] of ["Água", "Etanol", "Glicerol"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(3).fill("Rendimento");
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
  for (const [i, [a = 0, b = 0, c = 0]] of points.entries())
    await page
      .getByLabel(`Rendimento — Obs. ${i + 1}`, { exact: true })
      .fill(String(10 * a + 20 * b + 30 * c + 8 * a * b + 0.01 * (i % 3)));
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page
    .getByRole("checkbox", { name: "Incluir traço de Cox no resultado", exact: true })
    .check();
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("números válidos");
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
  const fields = page.getByTestId("cox-reference").getByRole("textbox");
  for (const [i, value] of ["0,2", "0,3", "0,4"].entries()) await fields.nth(i).fill(value);
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("somar 1");
  await fields.nth(2).fill("0,5");
  await page
    .getByTestId("cox-reference")
    .screenshot({ path: info.outputPath("cox-reference.png") });
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  const figure = page.getByTestId("cox-plot");
  await expect(figure).toBeVisible();
  await expect(figure.locator("polyline[data-cox-series]")).toHaveCount(3);
  await expect(page.getByTestId("cox-domain").locator("tbody tr").first()).toContainText("0,04");
  await figure.screenshot({ path: info.outputPath("cox-plot.png") });
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="cox-results"]').analyze()).violations,
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
      const outside = await figure.locator(".chart-canvas svg").evaluate((svg) => {
        const bounds = svg.getBoundingClientRect();
        return [...svg.querySelectorAll("text")]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return (
              box.left < bounds.left - 2 ||
              box.right > bounds.right + 2 ||
              box.top < bounds.top - 2 ||
              box.bottom > bounds.bottom + 2
            );
          })
          .map((element) => element.textContent);
      });
      expect(outside).toEqual([]);
      await figure.screenshot({ path: info.outputPath(`cox-${theme}-${language}.png`) });
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.getByText("Dados dos traços de Cox", { exact: true }).first().click();
  const source = page.getByTestId("cox-source");
  await expect(source.locator("tbody tr")).toHaveCount(20);
  for (const ext of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await source
      .getByRole("button", { name: `Dados dos traços de Cox (${ext})`, exact: true })
      .click();
    await (await pending).saveAs(info.outputPath(`cox-source.${ext.toLowerCase()}`));
  }
  await openFigureMenu(figure);
  const svgDownload = page.waitForEvent("download");
  await figure.getByRole("button", { name: /Figura — SVG/ }).click();
  await (await svgDownload).saveAs(info.outputPath("cox.svg"));
  for (const [id, ext] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    if (!id || !ext) throw new Error("control");
    const pending = page.waitForEvent("download");
    await page.getByTestId(id).click();
    await (await pending).saveAs(info.outputPath(`cox-report.${ext}`));
  }
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const archive = info.outputPath("cox.enzitag");
  await (await pending).saveAs(archive);
  const bytes = unzipSync(new Uint8Array(readFileSync(archive)))["project.json"];
  if (!bytes) throw new Error("project");
  const record = JSON.parse(strFromU8(bytes)).experiments[0].mixtureResult.records[0];
  expect(record.result.coxTrace.reference).toEqual([0.2, 0.3, 0.5]);
  expect(record.result.coxTrace.series).toHaveLength(3);
  const csv = readFileSync(info.outputPath("cox-source.csv"), "utf8");
  expect(
    csv
      .split("\n")
      .map((row) => row.trim())
      .filter((row) => row && !row.startsWith("#")),
  ).toHaveLength(
    record.result.coxTrace.series.reduce(
      (sum: number, s: { points: unknown[] }) => sum + s.points.length,
      1,
    ),
  );
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(archive);
  await expect(figure).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("cox-reference").getByRole("textbox").first().fill("inválido");
  await expect(page.getByTestId("mixture-analysis").getByRole("status")).toContainText("mudaram");
});

test("Cox salvo: oito componentes, referência pura, região pontual e previsões isoladas", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  for (const index of [3, 5, 6, 7]) {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL(
          `../../../../validation/cases/et25/b08-cox-fixtures/cox-${index}.enzitag`,
          import.meta.url,
        ),
      ),
    );
    await page.locator(".steps .step").nth(4).click();
    await expect(page.getByTestId("cox-results")).toBeVisible();
    await expect(page.getByTestId("cox-domain").locator("tbody tr")).toHaveCount(
      index === 3 ? 8 : 3,
    );
    await page
      .getByTestId("cox-results")
      .screenshot({ path: info.outputPath(`cox-case-${index}.png`) });
    if (index === 7) {
      const lengths = await page
        .getByTestId("cox-plot")
        .locator("polyline[data-cox-series]")
        .evaluateAll((paths) => paths.map((p) => p.getAttribute("points")?.split(" ").length));
      expect(lengths.every((length) => length === 1)).toBe(true);
    }
    expect(
      await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
    ).toBe(0);
  }
});
