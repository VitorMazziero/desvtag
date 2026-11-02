import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { showAllSections } from "./showAll";

// Exportação essencial (ET09) com o motor Rust real: tabelas em CSV (dois formatos) e XLSX,
// relatório HTML autocontido em outro idioma que o da interface, figuras com paleta acessível.

const example = fileURLToPath(
  new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
);

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByTestId("optimization-panel")).toBeVisible();
  await expect(page.getByTestId("export-panel")).toBeVisible();
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.beforeEach(async ({ page }) => {
  await showAllSections(page);
});

test.describe("exportação", () => {
  test("tabela em XLSX (arquivo zip com planilha e proveniência) e em CSV no formato do Excel", async ({
    page,
  }) => {
    await openExample(page);
    const xlsxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Coeficientes (XLSX)" }).click();
    const download = await xlsxDownload;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    const xlsx = readFileSync((await download.path()) as string);
    expect(xlsx.subarray(0, 2).toString("latin1")).toBe("PK");
    expect(xlsx.includes(Buffer.from("xl/worksheets/sheet1.xml"))).toBe(true);
    expect(xlsx.includes(Buffer.from("xl/worksheets/sheet2.xml"))).toBe(true);

    // CSV técnico: vírgula e ponto decimal; CSV "para Excel" em português: ponto e vírgula e vírgula decimal.
    const technical = page.waitForEvent("download");
    await page.getByRole("button", { name: "Coeficientes (CSV)" }).click();
    const csvTechnical = readFileSync((await (await technical).path()) as string, "utf8");
    expect(csvTechnical).toContain("term,estimate,std_error");
    expect(csvTechnical).toContain("# csv_format: technical");

    await page.getByLabel("Formato do CSV").selectOption("excel");
    const excel = page.waitForEvent("download");
    await page.getByRole("button", { name: "Coeficientes (CSV)" }).click();
    const csvExcel = readFileSync((await (await excel).path()) as string, "utf8");
    expect(csvExcel).toContain("term;estimate;std_error");
    expect(csvExcel).toMatch(/\d,\d/);
    expect(csvExcel).toContain("# csv_format: excel-pt");
  });

  test("relatório HTML em inglês com a interface em português: autocontido, sem controles, com figuras e proveniência", async ({
    page,
  }) => {
    await openExample(page);
    await page.getByLabel("Idioma dos arquivos exportados").selectOption("en");
    const download = page.waitForEvent("download");
    await page.getByTestId("report-button").click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/-relatorio\.html$/);
    const html = readFileSync((await file.path()) as string, "utf8");

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Provenance");
    expect(html).toContain("Response surface");
    expect(html).toContain("<svg");
    expect(html).toContain("Provenance");
    // Autocontido e sem controles interativos.
    // Nenhum marcador de tradução sem preencher e a evidência da ANOVA da regressão presente.
    expect(html).not.toContain("{{");
    expect(html).toContain("Regression ANOVA: F =");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("<input");
    expect(html).not.toMatch(/(src|href)="https?:/);
    expect(html).not.toContain("var(--");
    // Candidatos da otimização (somente leitura).
    expect(html).toContain("Desirability optimization");
    // A interface continua em português e o relatório oculto foi removido.
    await expect(
      page.getByRole("heading", { name: "Otimização", exact: false }).first(),
    ).toBeVisible();
    await expect(page.locator("[data-report-root]")).toHaveCount(0);
  });

  test("PDF do relatório e da figura: arquivo válido, fontes embutidas e figuras vetoriais", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openExample(page);
    await page.getByLabel("Idioma dos arquivos exportados").selectOption("en");
    const report = page.waitForEvent("download");
    await page.getByTestId("report-pdf-button").click();
    const reportFile = await report;
    expect(reportFile.suggestedFilename()).toMatch(/-relatorio\.pdf$/);
    const bytes = readFileSync((await reportFile.path()) as string);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(30_000);
    expect(bytes.toString("latin1")).toContain("%%EOF");
    expect(bytes.toString("latin1")).toContain("Roboto");
    const keep = process.env.ENZITAG_KEEP_DIR;
    if (keep) writeFileSync(`${keep}/relatorio.pdf`, bytes);

    const figure = page.getByTestId("surface-contour").first();
    const target = (await figure.count()) > 0 ? figure : page.locator("figure.chart").first();
    const figureDownload = page.waitForEvent("download");
    await target.getByRole("button", { name: /Figura — PDF/ }).click();
    const figureFile = await figureDownload;
    expect(figureFile.suggestedFilename()).toMatch(/\.pdf$/);
    const figureBytes = readFileSync((await figureFile.path()) as string);
    expect(figureBytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(figureBytes.toString("latin1")).toContain("%%EOF");
    if (keep) writeFileSync(`${keep}/figura.pdf`, figureBytes);
  });

  test("interface em inglês com relatório em português", async ({ page }) => {
    await openExample(page);
    await page.locator("header.app-header").getByLabel("Idioma").selectOption("en");
    await page.getByLabel("Language of exported files").selectOption("pt-BR");
    const download = page.waitForEvent("download");
    await page.getByTestId("report-button").click();
    const html = readFileSync((await (await download).path()) as string, "utf8");
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("Proveniência");
    expect(html).toContain("Resultados: superfície de resposta");
    expect(html).not.toContain("{{");
    await expect(page.getByRole("heading", { name: "Export and figure appearance" })).toBeVisible();
  });

  test("paleta acessível a daltonismo: a figura exportada usa as cores Okabe–Ito", async ({
    page,
  }) => {
    await openExample(page);
    await page.getByLabel("Paleta das figuras").selectOption("colorblind");
    const figure = page.getByTestId("observed-predicted-chart").first();
    await expect(figure).toBeVisible();
    const svgDownload = page.waitForEvent("download");
    await figure.getByRole("button", { name: /Figura — SVG/ }).click();
    const svg = readFileSync((await (await svgDownload).path()) as string, "utf8");
    expect(svg).toContain("#0072B2");
    expect(svg).not.toContain("var(");
  });

  for (const theme of ["soft-light", "modern-dark", "professional"] as const) {
    test(`axe: painel de exportação e resultados com paleta acessível no tema ${theme}`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
      await openExample(page);
      await page.getByLabel("Paleta das figuras").selectOption("colorblind");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map(
          (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        ),
      ).toEqual([]);
    });
  }
});
