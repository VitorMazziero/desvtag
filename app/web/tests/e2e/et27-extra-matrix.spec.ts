import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { clickAfterFocus } from "./clickAfterFocus";
import { openFigureMenu } from "./figureTools";
import { openSaturationTool } from "./menus";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"]) {
    test(`T09: ternary and saturation ${theme} ${language}`, async ({ page }, info) => {
      test.setTimeout(120_000);
      await page.addInitScript(
        ({ theme, language }) => {
          localStorage.setItem("optima.theme", theme);
          localStorage.setItem("optima.language", language);
          localStorage.setItem("optima.showAllSections", "1");
        },
        { theme, language },
      );
      for (const name of ["07-misturas-scheffe", "08-saturacao-monod"]) {
        await page.goto("/");
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: /^(Abrir…|Open…)$/, exact: true }).click();
        await (await chooser).setFiles(
          fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url)),
        );
        if (name.startsWith("07")) {
          await page.locator(".steps .step").nth(3).click();
          await page.getByTestId("mixture-model").selectOption("quadratic");
          await clickAfterFocus(
            page.getByRole("button", { name: /^(Ajustar modelo|Fit model)$/, exact: true }),
          );
        } else {
          const tool = await openSaturationTool(page);
          await tool
            .getByRole("button", { name: /^(Ajustar curva|Fit curve)$/, exact: true })
            .click();
        }
        const figure = page.getByTestId(
          name.startsWith("07") ? "ternary-plot" : "saturation-chart",
        );
        await expect(figure).toBeVisible();
        await openFigureMenu(figure);
        await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
        for (const scale of ["0.85", "1", "1.2"]) {
          await figure
            .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
            .selectOption(scale);
          const overflow = await figure.locator(".chart-canvas svg").evaluate((svg) => {
            const outer = svg.getBoundingClientRect();
            return [...svg.querySelectorAll("text")]
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return (
                  r.width &&
                  (r.left < outer.left - 2 ||
                    r.right > outer.right + 2 ||
                    r.top < outer.top - 2 ||
                    r.bottom > outer.bottom + 2)
                );
              })
              .map((e) => e.textContent);
          });
          expect(overflow, `${name} ${scale}`).toEqual([]);
        }
        await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
        await figure.getByTestId("figure-menu").locator(":scope > summary").click();
        await figure
          .locator(".chart-canvas")
          .screenshot({ path: info.outputPath(`T09-${theme}-${language}-${name}.png`) });
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
                  right: e.getBoundingClientRect().right,
                  text: e.textContent?.slice(0, 100),
                })),
            }));
            expect(
              geometry.scroll <= geometry.width + 1,
              `${name} ${width}px ${scale}: ${JSON.stringify(geometry)}`,
            ).toBe(true);
          }
        }
        await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
        await page.setViewportSize({ width: 1200, height: 892 });
      }
    });
  }
