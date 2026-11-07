// ET27: real Windows 10 WebView2, English, six themes and selected PDF font.
import { mkdirSync, readFileSync, readdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export async function runPolishCheck(page, exportDir, evidenceDir) {
  mkdirSync(evidenceDir, { recursive: true });
  await page.getByTestId("section-charts").click();
  await page.locator("header.app-header select").first().selectOption("en");
  await page.screenshot({ path: resolve(evidenceDir, "native-language-check.png") });
  console.log("ET27 header after language change:", await page.locator("header.app-header").textContent());
  for (const theme of ["soft-light", "modern-dark", "professional", "industrial", "organic", "clay"]) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    await page.evaluate(() => document.fonts.ready);
    const figure = page.getByTestId("means-chart");
    await figure.scrollIntoViewIfNeeded();
    await figure.screenshot({ path: resolve(evidenceDir, `native-${theme}-en-means.png`) });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) throw new Error(`Native page overflow: ${theme}`);
  }
  const figure = page.getByTestId("means-chart");
  const tools = figure.getByTestId("figure-menu");
  if (!(await tools.getAttribute("open")) && (await tools.getAttribute("open")) !== "") await tools.locator(":scope > summary").click();
  await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
  await figure.getByLabel("Font", { exact: true }).selectOption("serif");
  await figure.getByRole("button", { name: "Export preview", exact: true }).click();
  await page.getByTestId("preview-means-chart").screenshot({ path: resolve(evidenceDir, "native-neutral-preview-en.png") });
  await page.keyboard.press("Escape");
  await figure.getByRole("button", { name: "Figure — PDF", exact: true }).click();
  let selected;
  for (let i = 0; i < 240 && !selected; i++) {
    for (const name of readdirSync(exportDir).filter((n) => n.endsWith(".pdf") && !n.includes("relatorio"))) {
      const file = resolve(exportDir, name);
      if (readFileSync(file).toString("latin1").includes("DejaVuSerif")) { selected = file; break; }
    }
    if (!selected) await sleep(250);
  }
  if (!selected) throw new Error("Native PDF did not preserve the selected Serif font");
  copyFileSync(selected, resolve(evidenceDir, "native-serif-en.pdf"));
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.locator("header.app-header select").nth(1).selectOption("soft-light");
  console.log("OK: ET27 English, six themes, neutral preview and embedded Serif PDF verified in real WebView2.");
}
