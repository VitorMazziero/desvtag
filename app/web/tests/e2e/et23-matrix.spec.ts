import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openFigureMenu } from "./figureTools";
import { runRepeated, setupRepeated } from "./repeatedTools";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", acceptDownloads: true });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"])
    for (const name of ["cs_balanced", "ar1_negative_gaps", "un_missing"]) {
      test(`T09: ${name} ${theme} ${language}`, async ({ page }, info) => {
        test.setTimeout(120_000);
        await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
        await setupRepeated(page, name);
        await page.locator("header.app-header select").nth(1).selectOption(theme);
        await page.locator("header.app-header select").first().selectOption(language);
        await expect(page.getByTestId("mixed-time-effect")).toHaveValue("categorical");
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page
          .getByTestId("mixed-options")
          .screenshot({ path: info.outputPath(`${name}-${theme}-${language}-options.png`) });
        await page
          .getByRole("button", { name: /^(Ajustar modelo misto|Fit mixed model)$/, exact: true })
          .click();
        await expect(page.getByTestId("mixed-advanced-summary")).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        const figure = page.getByTestId("mixed-profile-chart");
        await openFigureMenu(figure);
        await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
        for (const scale of ["0.85", "1", "1.2"]) {
          await figure
            .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
            .selectOption(scale);
          const overflow = await figure.locator(".chart-canvas svg").evaluate((root) => {
            const outer = root.getBoundingClientRect();
            return [...root.querySelectorAll("text")]
              .filter((element) => {
                const box = element.getBoundingClientRect();
                return (
                  box.width &&
                  (box.left < outer.left - 2 ||
                    box.right > outer.right + 2 ||
                    box.top < outer.top - 2 ||
                    box.bottom > outer.bottom + 2)
                );
              })
              .map((e) => e.textContent);
          });
          expect(overflow).toEqual([]);
        }
        await figure
          .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
          .selectOption("1");
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
          await new Promise(requestAnimationFrame);
        });
        await page.setViewportSize({ width: 1200, height: 892 });
        await figure.getByTestId("figure-menu").locator(":scope > summary").click();
        await figure.screenshot({
          path: info.outputPath(`${name}-${theme}-${language}-profiles.png`),
        });
        await page
          .getByTestId("mixed-advanced-summary")
          .screenshot({ path: info.outputPath(`${name}-${theme}-${language}-summary.png`) });
      });
    }
