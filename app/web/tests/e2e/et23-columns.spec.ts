import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
});
const names = ["Lote A", "Lote_A", "Lote+A", "日本"];
const values = names.flatMap((name, i) => [
  `${name};Antes;${10 * (i + 1)};0,50`,
  `${name};Depois;${10 * (i + 1) + i + 1};1,50`,
]);

async function importCsv(page: Page, text: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  await (await chooser).setFiles({
    name: "occasions.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
  await page.getByTestId("import-wizard").waitFor();
}

async function save(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = await (await pending).path();
  if (!file) throw new Error("No project archive");
  const bytes = unzipSync(new Uint8Array(readFileSync(file)))["project.json"];
  if (!bytes) throw new Error("Missing project.json");
  return { file, document: JSON.parse(strFromU8(bytes)) };
}

test("T02: unit/time roles survive grid editing, table export and project reopening", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Unidades e ocasiões");
  await startObjective(page, "analyze");
  await importCsv(page, `unit_id;Condição;Resposta;time\n${values.join("\n")}\n`);
  await expect(page.getByLabel("Papel 1", { exact: true })).toHaveValue("unit");
  await expect(page.getByLabel("Papel 3", { exact: true })).toHaveValue("response");
  await expect(page.getByLabel("Papel 4", { exact: true })).toHaveValue("time");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await expect(
    page.getByRole("textbox", { name: "Tempo / ocasião — Obs. 1", exact: true }),
  ).toHaveValue("0,50");
  await expect(
    page.getByRole("textbox", { name: "Unidade experimental — Obs. 1", exact: true }),
  ).toHaveValue("Lote A");
  for (const format of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: `Baixar dados da grade (${format})`, exact: true })
      .click();
    await (await pending).saveAs(info.outputPath(`T02-observations.${format.toLowerCase()}`));
  }
  const csv = readFileSync(info.outputPath("T02-observations.csv"), "utf8");
  expect(csv).toContain("observation_id,unit_id,Condição,Resposta,time");
  expect(csv).toContain("Lote A,Antes,10,0.5");
  expect(csv).toContain("日本,Depois,44,1.5");
  await page.getByTestId("data-blocks-next").click();
  await page
    .getByRole("combobox", { name: "Estrutura das observações", exact: true })
    .selectOption("repeated");
  await page.getByRole("button", { name: "Comparar pares", exact: true }).click();
  await expect(page.getByTestId("paired-result")).toContainText("4 pares");
  await expect(page.getByTestId("paired-result")).toContainText("-2,5");
  const saved = await save(page);
  const experiment = saved.document.experiments[0];
  const record = experiment.mixedModelResult.records.at(-1);
  expect(new Set(Object.keys(record.input.unitLabels)).size).toBe(4);
  expect(Object.values(record.input.unitLabels).sort()).toEqual([...names].sort());
  expect(record.signature).toMatch(/^repeated:v2:/);
  expect(experiment.showTimeColumn).toBe(true);
  expect(experiment.revisions.at(-1).data.rows[0].timeText).toBe("0,50");
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(saved.file);
  await expect(page.getByTestId("paired-result")).toContainText("4 pares");
  await page.locator(".steps .step").nth(2).click();
  await expect(
    page.getByRole("textbox", { name: "Tempo / ocasião — Obs. 1", exact: true }),
  ).toHaveValue("0,50");
  await page.screenshot({ path: info.outputPath("T02-unit-time-grid.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("T02: a factor used as unit cannot merge distinct original labels", async ({ page }, info) => {
  await page.goto("/");
  await startObjective(page, "analyze");
  await importCsv(
    page,
    `Identificador;Condição;Resposta\n${values.map((line) => line.split(";").slice(0, 3).join(";")).join("\n")}\n`,
  );
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await page.getByTestId("data-blocks-next").click();
  await page
    .getByRole("combobox", { name: "Estrutura das observações", exact: true })
    .selectOption("repeated");
  await page.getByTestId("repeated-unit-source").getByRole("combobox").selectOption("f1");
  await page.getByRole("button", { name: "Comparar pares", exact: true }).click();
  await expect(page.getByTestId("paired-result")).toContainText("4 pares");
  const { document } = await save(page);
  const record = document.experiments[0].mixedModelResult.records.at(-1);
  expect(Object.values(record.input.unitLabels).sort()).toEqual([...names].sort());
  await page
    .getByTestId("saved-family-result")
    .screenshot({ path: info.outputPath("T02-distinct-unit-labels.png") });
});

for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"]) {
    test(`T02: column presentation ${theme} ${language}`, async ({ page }, info) => {
      await page.goto("/");
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      await startObjective(page, "analyze");
      await importCsv(page, `unit_id;Condição;Resposta;time\n${values.join("\n")}\n`);
      await page.getByLabel("Nome 2", { exact: true }).fill("Fase");
      await page.locator("header.app-header select").first().selectOption(language);
      await expect(
        page.getByLabel(language === "en" ? "Name 2" : "Nome 2", { exact: true }),
      ).toHaveValue("Fase");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page
        .getByTestId("import-wizard")
        .screenshot({ path: info.outputPath(`T02-${theme}-${language}-mapping.png`) });
      await page.getByRole("button", { name: /^(Importar|Import)$/, exact: true }).click();
      await page.getByTestId("variables-blocks-next").click();
      await expect(page.locator(".data-grid td[data-role=time] input").first()).toHaveValue("0,50");
      for (const width of [375, 800, 1200, 1920]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [0.85, 1, 1.2, 2]) {
          await page.evaluate((s) => {
            document.documentElement.style.fontSize = `${16 * s}px`;
          }, scale);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${width}px ${scale}`,
          ).toBe(true);
        }
      }
      await page.evaluate(async () => {
        document.documentElement.style.fontSize = "16px";
        await document.fonts.ready;
        await new Promise(requestAnimationFrame);
      });
      await page.setViewportSize({ width: 1200, height: 892 });
      await page.screenshot({
        path: info.outputPath(`T02-${theme}-${language}-grid.png`),
        fullPage: true,
      });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
