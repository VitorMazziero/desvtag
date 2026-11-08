import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { THEME_LIST } from "./themes";

// ET29-T01 e T02: o relatório sai completo MESMO com a barra de seções ativa (a v0.3.0 saía sem os
// resultados quando a seção ativa não era a de resultados), e o item ativo da barra é legível nos
// seis temas.

const example = fileURLToPath(
  new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
);

test.use({ locale: "pt-BR", acceptDownloads: true });

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByTestId("results-layout")).toBeVisible();
}

interface Exported {
  html: string;
  pdf: number;
  docxText: string;
  docxImages: number;
}

async function exportAll(page: Page): Promise<Exported> {
  await page.getByTestId("section-export").click();
  const take = async (testId: string) => {
    const download = page.waitForEvent("download");
    await page.getByTestId(testId).click();
    return readFileSync((await (await download).path()) as string);
  };
  const html = (await take("report-button")).toString("utf8");
  const pdf = (await take("report-pdf-button")).length;
  const files = unzipSync(new Uint8Array(await take("report-docx-button")));
  const docxText = strFromU8(files["word/document.xml"] as Uint8Array)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const docxImages = Object.keys(files).filter((f) => f.startsWith("word/media/")).length;
  return { html, pdf, docxText, docxImages };
}

test("relatório HTML, PDF e Word com a barra de seções ativa são iguais aos de «mostrar todas»", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const run = async (showAll: boolean) => {
    const context = await browser.newContext({ locale: "pt-BR", acceptDownloads: true });
    const page = await context.newPage();
    await page.addInitScript(
      (value) => localStorage.setItem("optima.showAllSections", value),
      showAll ? "1" : "0",
    );
    await openExample(page);
    const out = await exportAll(page);
    await context.close();
    return out;
  };
  const bar = await run(false);
  const all = await run(true);

  // Conteúdo que a v0.3.0 perdia: resumo, comparação de modelos e figuras (além da otimização).
  for (const text of [
    "Resultados: superfície de resposta",
    "Comparação dos modelos",
    "Otimização por desejabilidade",
  ]) {
    expect(bar.html, `HTML com a barra: «${text}»`).toContain(text);
  }
  expect(bar.html.match(/<svg/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  expect(bar.docxText).toContain("Comparação dos modelos");
  expect(bar.docxImages).toBeGreaterThanOrEqual(3);

  // Mesmo conteúdo com e sem a barra (os tamanhos diferem só pelo horário e pela proveniência).
  const near = (a: number, b: number, tolerance: number) =>
    Math.abs(a - b) / Math.max(a, b) <= tolerance;
  expect(
    near(bar.html.length, all.html.length, 0.02),
    `HTML ${bar.html.length} × ${all.html.length}`,
  ).toBe(true);
  expect(near(bar.pdf, all.pdf, 0.05), `PDF ${bar.pdf} × ${all.pdf}`).toBe(true);
  expect(near(bar.docxText.length, all.docxText.length, 0.02), "texto do Word").toBe(true);
  expect(bar.docxImages).toBe(all.docxImages);
});

test("exemplo 14 (o projeto do defeito relatado): o relatório traz o resumo, o modelo e as figuras", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "0"));
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(
    fileURLToPath(new URL("../../../../examples/14-meios/Meio_01.enzitag", import.meta.url)),
  );
  await expect(page.getByTestId("results-layout")).toBeVisible();
  const out = await exportAll(page);
  expect(out.html).toContain("Comparação dos modelos");
  expect(out.html.match(/<svg/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
  expect(out.docxText).toContain("Comparação dos modelos");
  expect(out.docxImages).toBeGreaterThanOrEqual(1);
});

for (const theme of THEME_LIST) {
  test(`axe: barra de seções com item ativo no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "0"));
    await openExample(page);
    await page.getByTestId("section-model").click();
    await expect(page.getByTestId("section-model")).toHaveAttribute("aria-current", "page");
    const result = await new AxeBuilder({ page }).include(".results-nav").analyze();
    expect(result.violations).toEqual([]);
  });
}
