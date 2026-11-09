import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { expectedVersion } from "./expectedVersion";
import { openExamplesTool, openPowerTool } from "./menus";

const example = (name: string) =>
  fileURLToPath(
    new URL(
      `../../../../examples/${name}/${name === "14-meios" ? "Meio_01.enzitag" : "projeto.enzitag"}`,
      import.meta.url,
    ),
  );
test.use({ locale: "pt-BR", acceptDownloads: true, storageState: { cookies: [], origins: [] } });
async function shot(page: Page, file: string, path: (file: string) => string) {
  await page.screenshot({ path: path(file), fullPage: false });
}
async function open(page: Page, name: string) {
  await page.goto("/");
  const choose = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await choose).setFiles(example(name));
}
test("Avaliação T14: resultado desatualizado e erro junto do campo", async ({ page }, info) => {
  await page.goto("/");
  await openPowerTool(page);
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-result")).toBeVisible();
  await openPowerTool(page);
  await page.getByLabel("Nível de significância (α)", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-stale")).toBeVisible();
  await shot(page, "T14-potencia.png", (f) => info.outputPath(f));
});
test("Avaliação T16 e T19: uma navegação e grade protegida", async ({ page }, info) => {
  await open(page, "02-triagem-meio-cultivo");
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  await expect(page.locator(".guided-actions:visible")).toHaveCount(1);
  await expect(page.getByLabel("Glicose — Obs. 1", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await shot(page, "T16-T19-grade.png", (f) => info.outputPath(f));
});
test("Avaliação T17: ações próprias, arquivo e experimento", async ({ page }, info) => {
  await page.goto("/");
  await shot(page, "T17-inicio.png", (f) => info.outputPath(f));
  await page.getByTestId("file-menu").locator(":scope > summary").click();
  await shot(page, "T17-arquivo.png", (f) => info.outputPath(f));
  await page.keyboard.press("Escape");
  const examples = await openExamplesTool(page);
  await examples.getByTestId("open-example-01").click();
  await expect(page.getByTestId("results-layout")).toBeVisible();
  await shot(page, "T17-exemplo.png", (f) => info.outputPath(f));
});
test("Avaliação T18: superfície e extremos executáveis", async ({ page }, info) => {
  await open(page, "03-superficie-meio-cultivo");
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  await page.getByTestId("twolevel-blocks-goal").click();
  await expect(page.getByTestId("design-real-extremes")).toBeVisible();
  await shot(page, "T18-extremos.png", (f) => info.outputPath(f));
});
test("Avaliação T20: configuração e resumo antes da execução", async ({ page }, info) => {
  await open(page, "01-enzimas-quatro-condicoes");
  await page.getByRole("button", { name: /^Análise/ }).click();
  await page.getByTestId("analysis-run-analysis-run").click();
  await expect(page.getByTestId("analysis-summary")).toContainText("Atividade");
  await shot(page, "T20-resumo.png", (f) => info.outputPath(f));
});
test("Avaliação T21: exportação, método e identidade de compilação", async ({ page }, info) => {
  await open(page, "14-meios");
  await page.getByTestId("section-export").click();
  await expect(page.getByTestId("export-summary")).toBeVisible();
  await shot(page, "T21-exportacao.png", (f) => info.outputPath(f));
  await page.getByTestId("about-menu").locator(":scope > summary").click();
  await expect(page.getByTestId("build-identity")).toContainText(expectedVersion);
  await shot(page, "T21-sobre.png", (f) => info.outputPath(f));
});
for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"])
  test(`Avaliação dos componentes no tema ${theme}`, async ({ page }, info) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await open(page, "02-triagem-meio-cultivo");
    await page.getByTestId("section-charts").click();
    await expect(page.getByTestId("pareto-chart")).toBeVisible();
    await shot(page, `tema-${theme}.png`, (f) => info.outputPath(f));
  });

for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"])
  test(`Comentários do navegador: espaçamento e largura no tema ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1064, height: 892 });
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await open(page, "01-enzimas-quatro-condicoes");
    await page.getByRole("button", { name: /Fatores e respostas/ }).click();
    const spacing = await page.evaluate(() => {
      const step = document.querySelector(".step-body > section:not([hidden])")!;
      const intro = step.querySelector(":scope > p")!.getBoundingClientRect();
      const blocks = step.querySelector(".guided")!.getBoundingClientRect();
      const collapse = document.querySelector(".collapse-stages")!.getBoundingClientRect();
      const steps = document.querySelector(".steps")!.getBoundingClientRect();
      const select = document.querySelector(".experiment-bar select")!.getBoundingClientRect();
      const buttons = [...document.querySelectorAll(".experiment-action")].map((e) =>
        e.getBoundingClientRect(),
      );
      return {
        introGap: blocks.top - intro.bottom,
        collapseGap: steps.top - collapse.bottom,
        centers: buttons.map((b) =>
          Math.abs(b.top + b.height / 2 - (select.top + select.height / 2)),
        ),
      };
    });
    expect(spacing.introGap).toBeGreaterThanOrEqual(20);
    expect(spacing.collapseGap).toBeGreaterThanOrEqual(12);
    expect(spacing.centers.every((v) => v <= 2)).toBe(true);
    await page.screenshot({
      path: info.outputPath(`comentarios-${theme}-variaveis.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await expect(page.getByLabel("Condição — Obs. 1", { exact: true })).toBeVisible();
    const widths = await page.evaluate(() => {
      const body = document.querySelector(".step-body")!.getBoundingClientRect();
      const grid = document.querySelector(".data-grid")!.getBoundingClientRect();
      const actions = [...document.querySelectorAll(".row-menu-button")]
        .filter((e) => !e.closest("[hidden]"))
        .map((e) => e.getBoundingClientRect());
      return {
        ratio: grid.width / body.width,
        actions: actions.map((r) => ({ width: r.width, height: r.height })),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect(widths.ratio).toBeGreaterThan(0.9);
    expect(widths.actions.every((r) => r.width <= 44 && r.height <= 44)).toBe(true);
    expect(widths.overflow).toBe(false);
    await page.locator(".data-grid").scrollIntoViewIfNeeded();
    await shot(page, `comentarios-${theme}-grade.png`, (f) => info.outputPath(f));
  });
