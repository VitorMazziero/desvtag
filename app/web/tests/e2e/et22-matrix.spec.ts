import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { THEME_LIST } from "./themes";

test.use({ storageState: { cookies: [], origins: [] }, acceptDownloads: true });
for (const theme of THEME_LIST)
  for (const language of ["pt-BR", "en"]) {
    test(`T07–T09: saved results ${theme} ${language}`, async ({ page }, info) => {
      test.setTimeout(180_000);
      await page.addInitScript(
        ({ theme, language }) => {
          localStorage.setItem("optima.theme", theme);
          localStorage.setItem("optima.language", language);
          localStorage.setItem("optima.showAllSections", "1");
        },
        { theme, language },
      );
      for (const [folder, family, method] of [
        ["07-misturas-scheffe", "mixture", "mixture_model"],
        ["08-saturacao-monod", "nonlinear", "nonlinear_saturation_fit"],
        ["11-medidas-repetidas", "repeated", "linear_mixed_model"],
        ["12-potencia-e-tamanho-de-amostra", "power", "power_analysis"],
      ] as const) {
        await page.goto("/");
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: /^(Abrir…|Open…)$/, exact: true }).click();
        await (await chooser).setFiles(
          fileURLToPath(new URL(`../../../../examples/${folder}/projeto.enzitag`, import.meta.url)),
        );
        const result = page.getByTestId("saved-family-result");
        await expect(result).toHaveAttribute("data-family", family);
        await expect(result.locator(".stale-notice")).toHaveCount(0);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        for (const width of [375, 800, 1200, 1920]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [0.85, 1, 1.2, 2]) {
            await page.evaluate((s) => {
              document.documentElement.style.fontSize = `${16 * s}px`;
            }, scale);
            const geometry = await page.evaluate(() => ({
              viewport: innerWidth,
              page: document.documentElement.scrollWidth,
            }));
            expect(geometry.page, `${family} ${width}px ${scale}`).toBeLessThanOrEqual(
              geometry.viewport + 1,
            );
          }
        }
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "16px";
        });
        await page.setViewportSize({ width: 1200, height: 892 });
        await result.scrollIntoViewIfNeeded();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        });
        await page.screenshot({ path: info.outputPath(`T09-${theme}-${language}-${family}.png`) });
        if (theme === "soft-light") {
          // Report content must remain complete even when only Export is visible.
          await page.getByTestId("show-all-sections").uncheck();
          await page.getByTestId("section-export").click();
          for (const [button, ext] of [
            ["report-button", "html"],
            ["report-pdf-button", "pdf"],
            ["report-docx-button", "docx"],
          ] as const) {
            const pending = page.waitForEvent("download");
            await page.getByTestId(button).click();
            await (await pending).saveAs(info.outputPath(`T07-${language}-${family}.${ext}`));
          }
          const html = readFileSync(info.outputPath(`T07-${language}-${family}.html`), "utf8");
          expect(html).toContain(method);
          expect(html).toContain(
            family === "mixture"
              ? "scheffe-coefficients"
              : family === "nonlinear"
                ? "saturation-parameters"
                : family === "repeated"
                  ? "mixed-coefficients"
                  : "power-curve",
          );
          if (family === "mixture" || family === "nonlinear") expect(html).toContain("<svg");
          expect(html).not.toContain('data-testid="result-record"');
          expect(html).not.toContain('data-testid="figure-menu"');
        }
      }
    });
  }
