import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { THEME_LIST } from "../e2e/themes";

// Capturas para a documentação: tela inicial (PT e EN) e resultados do exemplo 01 (PT e EN), em cada
// um dos seis temas, a 1200 px. As imagens são conferidas visualmente antes de serem versionadas.

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../../docs/imagens/capturas");
const example = resolve(here, "../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag");

for (const [lang, locale] of [
  ["pt", "pt-BR"],
  ["en", "en-US"],
] as const) {
  test.describe(`capturas ${lang}`, () => {
    test.use({ locale, viewport: { width: 1200, height: 900 } });
    for (const theme of THEME_LIST) {
      test(`${lang} · ${theme}`, async ({ page }) => {
        mkdirSync(out, { recursive: true });
        await page.goto("/");
        await page
          .getByLabel(lang === "pt" ? "Idioma" : "Language")
          .selectOption(lang === "pt" ? "pt-BR" : "en");
        await page.getByLabel(lang === "pt" ? "Tema" : "Theme").selectOption(theme);
        await page.waitForTimeout(300);
        await page.screenshot({ path: resolve(out, `inicio-${lang}-${theme}.png`) });

        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: lang === "pt" ? "Abrir…" : "Open…" }).click();
        await (await chooser).setFiles(example);
        await expect(page.getByTestId("results-layout")).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: resolve(out, `resultados-${lang}-${theme}.png`) });
      });
    }
  });
}
