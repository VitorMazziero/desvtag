import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { clickAfterFocus } from "./clickAfterFocus";
import { openFigureMenu } from "./figureTools";
import { openSaturationTool } from "./menus";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"])
    test(`T02: hierarchy and spaces ${theme} ${language}`, async ({ page }, info) => {
      await page.addInitScript(
        ({ theme, language }) => {
          localStorage.setItem("optima.theme", theme);
          localStorage.setItem("optima.language", language);
          localStorage.setItem("optima.showAllSections", "1");
        },
        { theme, language },
      );
      await page.goto("/");
      await startObjective(page, "plan");
      await page.getByRole("button", { name: /^(Adicionar fator|Add factor)$/ }).click();
      for (const width of [375, 800, 1200, 1920]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [0.85, 1, 1.2, 2]) {
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${16 * scale}px`;
          }, scale);
          const overflow = await page.evaluate(() =>
            [...document.querySelectorAll("body *")]
              .filter(
                (e) =>
                  e.checkVisibility() &&
                  e.getBoundingClientRect().right > innerWidth + 1 &&
                  !e.closest("[hidden]"),
              )
              .slice(0, 12)
              .map((e) => ({
                tag: e.tagName,
                className: e.className,
                right: e.getBoundingClientRect().right,
              })),
          );
          expect(overflow, `${width}px scale ${scale}`).toEqual([]);
          const layout = await page
            .locator(".editor-card")
            .first()
            .evaluate((card) => {
              const style = getComputedStyle(card);
              return {
                padding: Number.parseFloat(style.paddingLeft),
                gap: Number.parseFloat(style.rowGap),
              };
            });
          expect(layout.padding).toBeGreaterThanOrEqual(16);
          expect(layout.gap).toBeGreaterThanOrEqual(16);
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      await page.setViewportSize({ width: 1200, height: 892 });
      await page.screenshot({ path: info.outputPath(`T02-${theme}-${language}.png`) });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

for (const language of ["pt-BR", "en"])
  test(`T03: numeric tables retain full values ${language}`, async ({ page }, info) => {
    await page.addInitScript((language) => {
      localStorage.setItem("optima.language", language);
      localStorage.setItem("optima.showAllSections", "1");
    }, language);
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^(Abrir…|Open…)$/, exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL(
          "../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag",
          import.meta.url,
        ),
      ),
    );
    const value = page.getByTestId("group-table").locator("[data-full-value]").first();
    await expect(value).toBeVisible();
    expect(await value.getAttribute("title")).not.toBe("");
    await expect(page.locator("main")).not.toContainText("[object Object]");
    const cell = page.getByTestId("group-table").locator("td.num").first();
    expect(await cell.evaluate((e) => getComputedStyle(e).whiteSpace)).toBe("nowrap");
    expect(await cell.evaluate((e) => getComputedStyle(e).textAlign)).toBe("right");
    await page
      .getByTestId("anova-table")
      .screenshot({ path: info.outputPath(`T03-${language}-anova.png`) });
  });

test("T05: figure menu, neutral preview and embedded PDF fonts", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.theme", "modern-dark"));
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag", import.meta.url),
    ),
  );
  await page.getByTestId("section-charts").click();
  const figure = page.getByTestId("means-chart");
  await expect(figure.getByRole("button", { name: "Figura — PNG" })).not.toBeVisible();
  await openFigureMenu(figure);
  await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
  for (const family of ["serif", "mono"]) {
    await figure.getByLabel("Fonte", { exact: true }).selectOption(family);
    await figure.getByRole("button", { name: "Prévia da exportação", exact: true }).click();
    const preview = page.getByTestId("preview-means-chart");
    await expect(preview).toBeVisible();
    await preview.screenshot({ path: info.outputPath(`T05-preview-${family}.png`) });
    await page.keyboard.press("Escape");
    await expect(preview).not.toBeVisible();
    for (const format of ["SVG", "PNG", "PDF"]) {
      const pending = page.waitForEvent("download");
      await figure.getByRole("button", { name: `Figura — ${format}`, exact: true }).click();
      const file = await pending;
      if (format === "PDF")
        expect(readFileSync((await file.path())!, "latin1")).toContain(
          family === "serif" ? "DejaVuSerif" : "DejaVuSansMono",
        );
      if (format === "SVG")
        expect(readFileSync((await file.path())!, "utf8")).toContain('data-embedded-font="true"');
      await file.saveAs(info.outputPath(`T05-${family}.${format.toLowerCase()}`));
    }
  }
  await page.locator("header.app-header select").first().selectOption("en");
  await expect(figure.getByRole("status")).toContainText("File prepared:");
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const scroll = figure.locator(".chart-scroll").first();
  expect(await scroll.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
});

test("T05: extrapolation hatching remains a vector pattern in PDF", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/03-superficie-meio-cultivo/projeto.enzitag", import.meta.url),
    ),
  );
  const figure = page.getByTestId("contour-chart");
  await expect(figure).toBeVisible();
  await expect(figure.locator(".chart-canvas svg pattern")).toHaveCount(1);
  await openFigureMenu(figure);
  const pending = page.waitForEvent("download");
  await figure.getByRole("button", { name: "Figura — PDF", exact: true }).click();
  await (await pending).saveAs(info.outputPath("T05-contour-hatching.pdf"));
  await figure
    .locator(".chart-canvas")
    .screenshot({ path: info.outputPath("T05-contour-screen.png") });
});

for (const theme of THEME_LIST)
  test(`T04: scientific chart roles ${theme}`, async ({ page }, info) => {
    await page.addInitScript((theme) => localStorage.setItem("optima.theme", theme), theme);
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL("../../../../examples/02-triagem-meio-cultivo/projeto.enzitag", import.meta.url),
      ),
    );
    await page.getByTestId("section-charts").click();
    const figure = page.getByTestId("pareto-chart");
    await figure.locator(".chart-canvas").scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const roles = await figure.evaluate((e) => {
      const series = e.querySelector("[data-chart-data] rect")!;
      const reference = e.querySelector("[data-chart-data] line[stroke-dasharray]")!;
      return {
        series: getComputedStyle(series).fill,
        reference: getComputedStyle(reference).stroke,
      };
    });
    expect(roles.series).not.toBe(roles.reference);
    await figure
      .locator(".chart-canvas")
      .screenshot({ path: info.outputPath(`T04-${theme}-pareto.png`) });
  });

test("T06: samples, observations, common observed-predicted scale and color scale", async ({
  page,
}, info) => {
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  const open = async (name: string) => {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url)),
    );
  };
  await open("01-enzimas-quatro-condicoes");
  const means = page.getByTestId("means-chart");
  await expect(means.locator("[data-raw-observation]")).toHaveCount(20);
  await expect(means.locator(".chart-canvas")).toContainText("n = 5");
  await expect(page.getByTestId("box-chart").locator("[data-raw-observation]")).toHaveCount(20);
  await means.locator(".chart-canvas").screenshot({ path: info.outputPath("T06-means.png") });
  await expect(page.getByTestId("residuals-chart").locator("circle title").first()).toContainText(
    "o",
  );
  await open("03-superficie-meio-cultivo");
  const svg = page.getByTestId("observed-predicted-chart").locator(".chart-canvas svg");
  await expect(svg).toBeVisible();
  expect(await svg.getAttribute("data-x-domain")).toBe(await svg.getAttribute("data-y-domain"));
  const box = (await svg.getAttribute("data-plot"))!.split(" ").map(Number);
  expect(box[2]! - box[0]!).toBeCloseTo(box[3]! - box[1]!, 5);
  await expect(svg).toContainText("U/mL");
  await svg.screenshot({ path: info.outputPath("T06-observed-predicted.png") });
  await expect(page.getByTestId("contour-chart").locator("[data-color-scale]")).toHaveCount(60);
  await page
    .getByTestId("contour-chart")
    .locator(".chart-canvas")
    .screenshot({ path: info.outputPath("T06-contour.png") });
  await page
    .getByTestId("surface-chart")
    .locator(".chart-canvas")
    .screenshot({ path: info.outputPath("T06-surface3d.png") });
});

test("T06: ternary and saturation use the common figure tools and localized scales", async ({
  page,
}, info) => {
  const open = async (name: string) => {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url)),
    );
  };
  await open("07-misturas-scheffe");
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await page.getByTestId("section-charts").click();
  const ternary = page.getByTestId("ternary-plot");
  await expect(ternary).toBeVisible();
  await expect(ternary.locator("[data-color-scale]")).toHaveCount(60);
  await expect(ternary.locator("svg")).toContainText("0,2");
  await ternary.locator(".chart-canvas").screenshot({ path: info.outputPath("T06-ternary.png") });
  await openFigureMenu(ternary);
  let pending = page.waitForEvent("download");
  await ternary.getByRole("button", { name: "Figura — PDF", exact: true }).click();
  await (await pending).saveAs(info.outputPath("T06-ternary.pdf"));
  await open("08-saturacao-monod");
  const panel = await openSaturationTool(page);
  await panel.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await page.getByTestId("section-charts").click();
  const saturation = page.getByTestId("saturation-chart");
  await expect(saturation.locator("[data-confidence-band]")).toHaveCount(1);
  await expect(saturation.locator("svg")).toContainText("IC 95%");
  await saturation
    .locator(".chart-canvas")
    .screenshot({ path: info.outputPath("T06-saturation.png") });
  await openFigureMenu(saturation);
  pending = page.waitForEvent("download");
  await saturation.getByRole("button", { name: "Figura — PDF", exact: true }).click();
  await (await pending).saveAs(info.outputPath("T06-saturation.pdf"));
});

test("T07: decision criteria, candidate selection and original confirmation with engine difference", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
    ),
  );
  const panel = page.getByTestId("optimization-panel");
  await expect(panel.getByTestId("candidate-table")).toHaveCount(1);
  await expect(panel.getByTestId("optimization-criterion")).toContainText("Atividade enzimática");
  const target = page.getByLabel("Atividade enzimática — Alvo", { exact: true });
  await target.fill("");
  await page.getByRole("button", { name: "Buscar condições ótimas", exact: true }).click();
  await expect(target).toBeFocused();
  await expect(target).toHaveAttribute("aria-invalid", "true");
  await target.fill("105");
  await panel.getByRole("checkbox", { name: /^Subproduto —/ }).uncheck();
  await page.getByRole("button", { name: "Buscar condições ótimas", exact: true }).click();
  await expect(panel.getByTestId("candidate-ties")).toBeVisible();
  await expect(panel.getByTestId("candidate-summary")).toContainText("5");
  await expect(
    panel.getByTestId("desirability-chart").locator(".chart-canvas svg"),
  ).toHaveAttribute("data-color-domain", "0 1");
  await expect(panel.locator("[data-candidate-label]")).toHaveCount(5);
  await panel
    .getByTestId("candidate-table")
    .screenshot({ path: info.outputPath("T07-candidates.png") });
  await panel
    .getByTestId("desirability-chart")
    .locator(".chart-canvas")
    .screenshot({ path: info.outputPath("T07-desirability.png") });
  await panel.getByTestId("candidate-table").getByRole("checkbox").nth(1).check();
  await expect(panel.getByTestId("confirmation-selection")).toContainText("2");
  await page.getByLabel("Repetições por candidato").fill("1");
  await page.getByRole("button", { name: "Propor ensaios de confirmação", exact: true }).click();
  const check = page.getByTestId("confirmation-check");
  await expect(check).toBeVisible();
  const predicted = Number(
    await check
      .locator('[data-testid^="confirmation-predicted-"] [data-full-value]')
      .first()
      .getAttribute("data-full-value"),
  );
  await page
    .getByRole("textbox", { name: "Atividade enzimática — Obs. 1", exact: true })
    .fill(String(predicted + 1.5));
  await expect(check.locator('[data-testid^="confirmation-difference-"]').first()).toContainText(
    "1,5 U/mL",
  );
  await check.screenshot({ path: info.outputPath("T07-confirmation.png") });
  await check.getByTestId("confirmation-origin").click();
  const origin = page.getByTestId("confirmation-origin-dialog");
  await expect(origin.getByTestId("candidate-table")).toHaveCount(1);
  await expect(origin.getByTestId("optimization-criterion")).toContainText("105");
  await origin.screenshot({ path: info.outputPath("T07-origin.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Atividade enzimática — Obs. 1", exact: true }).fill("");
  await expect(check.locator('[data-testid^="confirmation-difference-"]').first()).toContainText(
    "s/d",
  );
});

test("T08: edit comments without losing metadata, escape and save/reopen", async ({
  page,
}, info) => {
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
    ),
  );
  const panel = page.getByTestId("comments-panel");
  const summary = panel.locator(":scope > summary");
  await clickAfterFocus(summary);
  await panel.getByLabel("Novo comentário").fill("Texto original");
  await panel.getByLabel("Seu nome").fill("Ana");
  await panel.getByRole("button", { name: "Comentar", exact: true }).click();
  const comment = panel.getByTestId("comment-c1");
  const metadata = await comment.locator(":scope > p").first().textContent();
  await comment.getByRole("button", { name: "Editar", exact: true }).click();
  await comment.getByLabel("Texto do comentário").fill("Rascunho");
  await page.keyboard.press("Escape");
  await expect(comment.getByRole("button", { name: "Editar", exact: true })).toBeFocused();
  await expect(comment).toContainText("Texto original");
  await comment.getByRole("button", { name: "Editar", exact: true }).click();
  await comment.getByLabel("Texto do comentário").fill("");
  await expect(comment.getByRole("button", { name: "Salvar edição", exact: true })).toBeDisabled();
  await comment.getByLabel("Texto do comentário").fill("Texto revisado");
  await comment.getByRole("button", { name: "Salvar edição", exact: true }).click();
  await expect(comment).toContainText(metadata!);
  await expect(comment).toContainText("editado em");
  await comment.screenshot({ path: info.outputPath("T08-comment.png") });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const saved = await (await download).path();
  await page.reload();
  const reopen = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await reopen).setFiles(saved!);
  await clickAfterFocus(summary);
  await expect(comment).toContainText("Texto revisado");
  await expect(comment).toContainText("editado em");
});

test("T08: browser-specific keyboard hint and menu Escape", async ({ page, browserName }) => {
  await page.goto("/");
  const about = page.getByTestId("about-menu");
  await about.locator(":scope > summary").click();
  await expect(about.getByTestId("keyboard-browser-hint")).toHaveCount(
    browserName === "webkit" ? 1 : 0,
  );
  await page.keyboard.press("Escape");
  await expect(about.locator(":scope > summary")).toBeFocused();
  await expect(about).not.toHaveAttribute("open");
});
