import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openFigureMenu } from "./figureTools";
import { cases, setupProfile } from "./nonlinearTools";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR" });
for (const source of cases)
  for (const theme of THEME_LIST)
    for (const language of ["pt-BR", "en"])
      test(`T04 matrix ${source.name} ${theme} ${language}`, async ({ page }, info) => {
        test.setTimeout(120_000);
        await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
        const tool = await setupProfile(page, source);
        // Close the modal to reach the header preferences, then reopen its retained options.
        await page.keyboard.press("Escape");
        await page.locator("header.app-header select").nth(1).selectOption(theme);
        await page.locator("header.app-header select").first().selectOption(language);
        await page.getByTestId("extras-menu").locator(":scope > summary").click();
        await page.getByTestId("open-saturation").click();
        expect(
          (await new AxeBuilder({ page }).include('[data-testid="saturation-dialog"]').analyze())
            .violations,
        ).toEqual([]);
        await tool
          .getByTestId("nonlinear-options")
          .screenshot({ path: info.outputPath(`${source.name}-${theme}-${language}-options.png`) });
        await tool
          .getByRole("button", { name: /^(Ajustar curva|Fit curve)$/, exact: true })
          .click();
        await expect(page.getByTestId("likelihood-profile-a")).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        for (const figure of await page
          .locator('[data-testid^="likelihood-profile-"]')
          .filter({ has: page.locator(".chart-canvas") })
          .all()) {
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
        }
        for (const width of [375, 800, 1200, 1920]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [0.85, 1, 1.2, 2]) {
            await page.evaluate(
              (s) => (document.documentElement.style.fontSize = `${16 * s}px`),
              scale,
            );
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              `${width}/${scale}`,
            ).toBe(true);
          }
        }
        await page.evaluate(async () => {
          document.documentElement.style.fontSize = "16px";
          await document.fonts.ready;
        });
        await page.setViewportSize({ width: 1200, height: 892 });
        await page
          .getByTestId("likelihood-profile-a")
          .screenshot({ path: info.outputPath(`${source.name}-${theme}-${language}-profile.png`) });
        await page
          .getByTestId("likelihood-profiles")
          .screenshot({ path: info.outputPath(`${source.name}-${theme}-${language}-limits.png`) });
      });
