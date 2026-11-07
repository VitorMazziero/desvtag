import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openFigureMenu } from "./figureTools";
import { openPowerTool } from "./menus";
import { setupPower } from "./powerTools";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR" });
for (const name of ["regression_correlated", "contrast_unequal", "factorial_interaction"])
  for (const theme of THEME_LIST)
    for (const language of ["pt-BR", "en"])
      test(`T08 power matrix ${name} ${theme} ${language}`, async ({ page }, info) => {
        test.setTimeout(120_000);
        await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
        const { tool } = await setupPower(page, name);
        await page.keyboard.press("Escape");
        await page.locator("header.app-header select").nth(1).selectOption(theme);
        await page.locator("header.app-header select").first().selectOption(language);
        await openPowerTool(page);
        expect(
          (await new AxeBuilder({ page }).include('[data-testid="power-dialog"]').analyze())
            .violations,
        ).toEqual([]);
        for (const width of [375, 800, 900, 1064, 1200, 1920]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [0.85, 1, 1.2, 2]) {
            await page.evaluate(
              (s) => (document.documentElement.style.fontSize = `${16 * s}px`),
              scale,
            );
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              `page ${width}/${scale}`,
            ).toBe(true);
            const dialog = page.getByTestId("power-dialog");
            expect(
              await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
              `dialog ${width}/${scale}`,
            ).toBe(true);
          }
        }
        await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
        await page.setViewportSize({ width: 1200, height: 892 });
        await tool.getByTestId("power-advanced-options").scrollIntoViewIfNeeded();
        await tool
          .getByTestId("power-advanced-options")
          .screenshot({ path: info.outputPath(`${name}-${theme}-${language}-options.png`) });
        await tool.getByTestId("power-simulation-options").scrollIntoViewIfNeeded();
        await page
          .getByTestId("power-dialog")
          .screenshot({ path: info.outputPath(`${name}-${theme}-${language}-simulation.png`) });
        await tool.getByRole("button", { name: /^(Calcular|Calculate)$/, exact: true }).click();
        await expect(page.getByTestId("power-simulation-result")).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        const prose = page.locator(".facts .fact-prose").first();
        expect(await prose.evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/mono/i);
        expect(
          await page.getByTestId("power-summary").evaluate((el) => Boolean(el.nextElementSibling)),
        ).toBe(true);
        const figure = page.getByTestId("power-chart");
        await openFigureMenu(figure);
        await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
        for (const scale of ["0.85", "1", "1.2"]) {
          await figure
            .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
            .selectOption(scale);
          expect(
            await figure.locator(".chart-canvas svg").evaluate((root) => {
              const rect = root.getBoundingClientRect();
              return [...root.querySelectorAll("text")]
                .filter((el) => {
                  const box = el.getBoundingClientRect();
                  return (
                    box.width &&
                    (box.left < rect.left - 2 ||
                      box.right > rect.right + 2 ||
                      box.top < rect.top - 2 ||
                      box.bottom > rect.bottom + 2)
                  );
                })
                .map((el) => el.textContent);
            }),
          ).toEqual([]);
        }
        await figure
          .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
          .selectOption("1");
        await figure.getByTestId("figure-menu").locator(":scope > summary").click();
        expect(await figure.locator('svg text[text-anchor="end"]').allTextContents()).toEqual(
          language === "pt-BR"
            ? ["0", "0,2", "0,4", "0,6", "0,8", "1"]
            : ["0", "0.2", "0.4", "0.6", "0.8", "1"],
        );
        for (const width of [375, 800, 900, 1064, 1200, 1920]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [0.85, 1, 1.2, 2]) {
            await page.evaluate(
              (s) => (document.documentElement.style.fontSize = `${16 * s}px`),
              scale,
            );
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              `result ${width}/${scale}`,
            ).toBe(true);
          }
        }
        await page.evaluate(async () => {
          document.documentElement.style.fontSize = "16px";
          await document.fonts.ready;
        });
        await page.setViewportSize({ width: 1200, height: 892 });
        await figure.screenshot({
          path: info.outputPath(`${name}-${theme}-${language}-curve.png`),
        });
        await page
          .getByTestId("power-result")
          .screenshot({ path: info.outputPath(`${name}-${theme}-${language}-result.png`) });
      });
