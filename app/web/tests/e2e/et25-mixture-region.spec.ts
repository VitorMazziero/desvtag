import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { openFigureMenu } from "./figureTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 }, acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { mixtureFits: number; mixturePreviews: number };
    host.mixtureFits = 0;
    host.mixturePreviews = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = message as { requestJson?: string };
      if (data.requestJson && JSON.parse(data.requestJson).operation.type === "mixtureAnalyze")
        host.mixtureFits++;
      if (
        data.requestJson &&
        JSON.parse(data.requestJson).operation.type === "designMixtureGenerate"
      )
        host.mixturePreviews++;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

async function configureComponents(page: Page) {
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [index, name] of ["Água", "Etanol", "Glicerol"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(index).fill(name);
    await page.getByLabel("Tipo").nth(index).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(3).fill("Rendimento");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Misturas/ })
    .check();
}

test("mistura com posto deficiente mantém pontos estimáveis e não colore o interior", async ({
  page,
}, info) => {
  await configureComponents(page);
  await page.getByLabel("Grau m do lattice", { exact: true }).fill("1");
  await page.getByLabel("Repetições dos pontos", { exact: true }).fill("1");
  await page.getByLabel("Aleatorizar a ordem de execução", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Gerar planejamento", exact: true }).click();
  await expect(page.getByTestId("mixture-table").locator("tbody tr")).toHaveCount(3);
  for (const [index, value] of [30, 20, 10].entries()) {
    await page.getByLabel(`Rendimento — Obs. ${index + 1}`, { exact: true }).fill(String(value));
  }
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  const figure = page.getByTestId("ternary-plot");
  await expect(figure).toBeVisible();
  await expect(figure.locator('svg [data-chart-data="true"] polygon')).toHaveCount(0);
  await expect(page.getByText(/Foram omitidas .* previsões não estimáveis/)).toBeVisible();
  await figure.screenshot({ path: info.outputPath("non-estimable-interior.png") });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = info.outputPath("rank-deficient-v1.enzitag");
  await (await pending).saveAs(file);
  const archive = unzipSync(new Uint8Array(readFileSync(file)));
  const project = archive["project.json"],
    manifestBytes = archive["manifest.json"];
  if (!project || !manifestBytes) throw new Error("Missing archive members");
  const document = JSON.parse(strFromU8(project));
  const result = document.experiments[0].mixtureResult.records[0].result;
  result.provenance.methodVersion = 1;
  delete result.gridDivisions;
  const changed = strToU8(JSON.stringify(document));
  const manifest = JSON.parse(strFromU8(manifestBytes));
  manifest.files[0].sha256 = createHash("sha256").update(changed).digest("hex");
  manifest.files[0].size = changed.length;
  archive["project.json"] = changed;
  archive["manifest.json"] = strToU8(JSON.stringify(manifest));
  writeFileSync(file, zipSync(archive));
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText(/versão anterior do método com posto deficiente/)).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
});

test("mistura limitada: hexágono, ajuste, domínio da figura e arquivo reaberto sem ajuste", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await configureComponents(page);
  const panel = page.getByTestId("mixture-panel");
  await panel.getByRole("combobox").first().selectOption("extremeVertices");
  for (const name of ["Água", "Etanol", "Glicerol"])
    await page.getByLabel(`Limite superior de ${name}`, { exact: true }).fill("0,6");
  await page.getByLabel("Pontos centrais extras", { exact: true }).fill("1");
  await page.getByLabel("Aleatorizar a ordem de execução", { exact: true }).uncheck();
  await expect(page.getByTestId("mixture-region-summary")).toContainText(
    "6 vértices, 6 arestas e dimensão 2",
  );
  await expect(page.getByTestId("mixture-count")).toContainText("25 ensaios");
  const previews = await page.evaluate(
    () => (window as unknown as { mixturePreviews: number }).mixturePreviews,
  );
  await page.getByLabel("Limite superior de Água", { exact: true }).fill("inválido");
  await expect(panel.getByRole("alert")).toContainText("números válidos");
  await expect(
    page.getByRole("button", { name: "Gerar planejamento", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => (window as unknown as { mixturePreviews: number }).mixturePreviews),
  ).toBe(previews);
  for (const name of ["Água", "Etanol", "Glicerol"])
    await page.getByLabel(`Limite superior de ${name}`, { exact: true }).fill("0,2");
  await expect(panel.getByRole("alert")).toContainText("soma de pelo menos 1");
  for (const name of ["Água", "Etanol", "Glicerol"])
    await page.getByLabel(`Limite superior de ${name}`, { exact: true }).fill("0,6");
  await expect(page.getByTestId("mixture-count")).toContainText("25 ensaios");
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("bounded-config.png") });
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
  expect(points.every((row) => row.every((x) => x >= 0 && x <= 0.6 + 1e-10))).toBe(true);
  expect(points.every((row) => Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-8)).toBe(true);
  const values = points
    .map(([a = 0, b = 0, c = 0], i) =>
      String(10 * a + 20 * b + 30 * c + 8 * a * b + ((i % 3) - 1) * 0.01),
    )
    .join("\n");
  await page.getByLabel("Rendimento — Obs. 1", { exact: true }).evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    element.dispatchEvent(event);
  }, values);
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await expect(page.getByTestId("scheffe-coefficients").locator("tbody tr")).toHaveCount(6);
  await expect(page.getByTestId("mixture-saved-bounds")).toContainText("0,6");
  const figure = page.getByTestId("ternary-plot");
  await expect(figure).toBeVisible();
  await figure.screenshot({ path: info.outputPath("bounded-ternary.png") });
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="mixture-saved-bounds"]').analyze())
      .violations,
  ).toEqual([]);
  for (const theme of THEME_LIST) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    for (const language of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(language);
      await page.evaluate(() => document.fonts.ready);
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
      await figure.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`bounded-${theme}-${language}.png`) });
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await openFigureMenu(figure);
  const svgDownload = page.waitForEvent("download");
  await figure.getByRole("button", { name: /Figura — SVG/ }).click();
  await (await svgDownload).saveAs(info.outputPath("bounded-ternary.svg"));
  for (const [id, extension] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    if (!id || !extension) throw new Error("export control");
    const pending = page.waitForEvent("download");
    await page.getByTestId(id).click();
    await (await pending).saveAs(info.outputPath(`bounded-report.${extension}`));
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = info.outputPath("bounded-mixture.enzitag");
  await (await download).saveAs(file);
  const projectBytes = unzipSync(new Uint8Array(readFileSync(file)))["project.json"];
  if (!projectBytes) throw new Error("Missing project.json");
  const doc = JSON.parse(strFromU8(projectBytes));
  const record = doc.experiments[0].mixtureResult.records[0];
  expect(record.input.request.upperBounds).toEqual([0.6, 0.6, 0.6]);
  expect(record.result.gridDivisions).toBe(24);
  expect(
    record.result.grid.every((point: { proportions: number[] }) =>
      point.proportions.every((x) => x <= 0.6 + 1e-12),
    ),
  ).toBe(true);
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByTestId("mixture-saved-bounds")).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { mixtureFits: number }).mixtureFits),
  ).toBe(0);
});
