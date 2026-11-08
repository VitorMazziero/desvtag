import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openFigureMenu } from "./figureTools";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"]) {
    test(`T09: scientific family composition ${theme} ${language}`, async ({ page }, info) => {
      test.setTimeout(180_000);
      await page.addInitScript(
        ({ theme, language }) => {
          localStorage.setItem("optima.theme", theme);
          localStorage.setItem("optima.language", language);
          localStorage.setItem("optima.showAllSections", "1");
        },
        { theme, language },
      );
      for (const [name, figures] of [
        [
          "01-enzimas-quatro-condicoes",
          ["means-chart", "box-chart", "residuals-chart", "qq-chart"],
        ],
        ["02-triagem-meio-cultivo", ["pareto-chart", "main-effects-chart", "interaction-chart"]],
        [
          "03-superficie-meio-cultivo",
          ["observed-predicted-chart", "contour-chart", "surface-chart"],
        ],
      ] as const) {
        await page.goto("/");
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: /^(Abrir…|Open…)$/, exact: true }).click();
        await (await chooser).setFiles(
          fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url)),
        );
        if (name === "02-triagem-meio-cultivo") {
          await page.locator(".steps .step").nth(3).click();
          await page
            .getByLabel(
              /^(Efeitos principais e interações de dois fatores|Main effects and two-factor interactions)$/,
            )
            .check();
          await page
            .getByRole("button", { name: /^(Analisar planejamento|Analyse design)$/, exact: true })
            .click();
        }
        for (const id of figures) {
          const figure = page.getByTestId(id);
          await expect(figure).toBeVisible();
          await openFigureMenu(figure);
          await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
          for (const scale of ["0.85", "1", "1.2"]) {
            await figure
              .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
              .selectOption(scale);
            const svg = figure.locator(".chart-canvas svg");
            const overflow = await svg.evaluate((root) => {
              const outer = root.getBoundingClientRect();
              return [...root.querySelectorAll("text")]
                .filter((e) => {
                  const rect = e.getBoundingClientRect();
                  return (
                    rect.width &&
                    (rect.left < outer.left - 2 ||
                      rect.right > outer.right + 2 ||
                      rect.top < outer.top - 2 ||
                      rect.bottom > outer.bottom + 2)
                  );
                })
                .map((e) => e.textContent);
            });
            expect(overflow, `${id} scale ${scale}`).toEqual([]);
          }
          await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
          await figure.getByTestId("figure-menu").locator(":scope > summary").click();
          await figure
            .locator(".chart-canvas")
            .screenshot({ path: info.outputPath(`T09-${theme}-${language}-${id}.png`) });
        }
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        for (const width of [375, 800, 1200, 1920]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [0.85, 1, 1.2, 2]) {
            await page.evaluate(
              (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
              scale,
            );
            const geometry = await page.evaluate(() => ({
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              texts: (() => {
                const out: unknown[] = [];
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                  const p = node.parentElement;
                  if (!p?.checkVisibility() || p.closest(".grid-scroll, .chart-scroll, [hidden]"))
                    continue;
                  const r = document.createRange();
                  r.selectNodeContents(node);
                  const b = r.getBoundingClientRect();
                  if (b.right > innerWidth + 1)
                    out.push({
                      tag: p.tagName,
                      className: p.className,
                      text: node.textContent,
                      right: b.right,
                    });
                }
                return out.slice(0, 12);
              })(),
              outside: [...document.querySelectorAll("body *")]
                .filter(
                  (e) =>
                    e.checkVisibility() &&
                    !e.closest(".grid-scroll > *, .chart-scroll > *, [hidden]") &&
                    e.getBoundingClientRect().right > innerWidth + 1,
                )
                .slice(0, 12)
                .map((e) => ({
                  tag: e.tagName,
                  className: e.getAttribute("class"),
                  text: e.textContent?.slice(0, 80),
                  width: e.getBoundingClientRect().width,
                  right: e.getBoundingClientRect().right,
                })),
            }));
            expect(
              geometry.scroll <= geometry.width + 1,
              `${width}px ${scale}: ${JSON.stringify(geometry)}`,
            ).toBe(true);
          }
        }
        await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
        await page.setViewportSize({ width: 1200, height: 892 });
      }
    });
  }
