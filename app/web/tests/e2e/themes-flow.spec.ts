import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { showAllSections } from "./showAll";
import { THEME_LIST } from "./themes";

// Seis temas e logotipo do grupo (ET12): seletor, persistência, logotipo offline e nos seis temas,
// exportação independente do tema e grade de dados com 1 000 linhas.

const example = fileURLToPath(
  new URL("../../../../examples/06-kla-sintetico/projeto.enzitag", import.meta.url),
);

test.use({ locale: "pt-BR", acceptDownloads: true });

const html = (page: Page) => page.locator("html");

test("o seletor oferece os seis temas, aplica e lembra a escolha; valor desconhecido volta ao padrão", async ({
  page,
}) => {
  await page.goto("/");
  const select = page.getByLabel("Tema");
  const options = await select.locator("option").allTextContents();
  expect(options).toEqual([
    "Soft Light",
    "Modern Dark",
    "Professional",
    "Industrial",
    "Organic",
    "Clay",
  ]);
  for (const theme of THEME_LIST) {
    await select.selectOption(theme);
    await expect(html(page)).toHaveAttribute("data-theme", theme);
  }
  await select.selectOption("clay");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "clay");
  await page.evaluate(() => localStorage.setItem("optima.theme", "tema-do-futuro"));
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "soft-light");
});

test("o logotipo do grupo aparece no cabeçalho e na tela inicial, sem rede, nos seis temas", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith("http://127.0.0.1") && !url.startsWith("data:") && !url.startsWith("blob:"))
      external.push(url);
  });
  await page.goto("/");
  for (const theme of THEME_LIST) {
    await page.getByLabel("Tema").selectOption(theme);
    for (const id of ["group-logo-header", "group-logo-large"]) {
      const logo = page.getByTestId(id);
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("alt", "Logotipo EnziTAG");
      expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(558);
    }
  }
  expect(external).toEqual([]);
  await page.getByLabel("Idioma").selectOption("en");
  await expect(page.getByTestId("group-logo-header")).toHaveAttribute("alt", "EnziTAG logo");
});

test("a figura exportada é a mesma em qualquer tema", async ({ page }) => {
  test.setTimeout(120_000);
  await showAllSections(page);
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByTestId("results-layout")).toBeVisible();
  const figure = page.getByTestId("observed-predicted-chart");
  const exportSvg = async () => {
    const download = page.waitForEvent("download");
    await figure.getByRole("button", { name: /Figura — SVG/ }).click();
    // A data da exportação é o único trecho que muda entre exportações.
    return readFileSync((await (await download).path()) as string, "utf8").replace(
      /exportedAt&quot;:&quot;[^&]*&quot;/,
      "exportedAt",
    );
  };
  await page.getByLabel("Tema").selectOption("soft-light");
  const reference = await exportSvg();
  expect(reference).not.toContain("var(--");
  for (const theme of ["industrial", "organic", "clay"]) {
    await page.getByLabel("Tema").selectOption(theme);
    // O desenho na tela usa os tokens do tema; o arquivo exportado não muda.
    const other = await exportSvg();
    if (other !== reference && process.env.ENZITAG_KEEP_DIR) {
      writeFileSync(`${process.env.ENZITAG_KEEP_DIR}/tema-a.svg`, reference);
      writeFileSync(`${process.env.ENZITAG_KEEP_DIR}/tema-b.svg`, other);
    }
    expect(other === reference).toBe(true);
  }
});

test("a grade de dados com 1 000 linhas continua fluida nos temas novos", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("y");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const values = Array.from({ length: 1000 }, (_, i) =>
    String(10 + (i % 17) * 0.5).replace(".", ","),
  ).join("\n");
  const timings: Record<string, number> = {};
  for (const theme of ["industrial", "organic", "clay"]) {
    await page.getByLabel("Tema").selectOption(theme);
    const started = Date.now();
    await page.getByLabel("y — Obs. 1", { exact: true }).evaluate((el, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    }, values);
    await expect(page.getByLabel("y — Obs. 1000", { exact: true })).toBeVisible();
    timings[theme] = Date.now() - started;
  }
  console.log("grade com 1000 linhas (ms):", JSON.stringify(timings));
  for (const ms of Object.values(timings)) expect(ms).toBeLessThan(20_000);
});

for (const theme of ["industrial", "organic", "clay"]) {
  test(`${theme}: movimento reduzido, alto contraste e tela estreita`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    // Movimento reduzido: sem transições nos controles, mantendo cor e profundidade.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const transition = await page
      .getByRole("button", { name: "Salvar", exact: true })
      .evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(transition).toBe("none");
    // Alto contraste do Windows: relevo e sombras somem; as bordas reais permanecem.
    await page.emulateMedia({ forcedColors: "active" });
    const forced = await page
      .getByRole("button", { name: "Salvar", exact: true })
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return { shadow: style.boxShadow, border: style.borderTopWidth };
      });
    expect(forced.shadow).toBe("none");
    expect(forced.border).not.toBe("0px");
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    // Largura de celular: sem rolagem horizontal da página e sem violações de acessibilidade.
    await page.setViewportSize({ width: 375, height: 760 });
    await expect(page.getByTestId("group-logo-header")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
