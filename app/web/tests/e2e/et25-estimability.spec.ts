import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

// ET25 T08: fração com células vazias — o diagnóstico de posto e a comparação estimável B3 − B2
// chegam à tela a partir do motor Rust real (WebAssembly).

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 } });

async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

test("fração incompleta: posto, confundimento e médias não estimáveis na tela", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await startObjective(page, "compare");
  for (const [i, [name, levels]] of (
    [
      ["A", "a1; a2"],
      ["B", "b1; b2; b3"],
    ] as const
  ).entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Níveis (opcional)").nth(i).fill(levels);
  }
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const rows = [
    ["a1", "b1", "10"],
    ["a1", "b1", "11"],
    ["a1", "b2", "14"],
    ["a1", "b2", "15"],
    ["a2", "b2", "13"],
    ["a2", "b2", "12"],
    ["a2", "b3", "9"],
    ["a2", "b3", "8"],
  ];
  const nl = String.fromCharCode(10);
  await paste(page, "A — Obs. 1", rows.map((r) => r[0]).join(nl));
  await paste(page, "B — Obs. 1", rows.map((r) => r[1]).join(nl));
  await paste(page, "Atividade — Obs. 1", rows.map((r) => r[2]).join(nl));
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("radio", { name: /Vários fatores/ }).check();
  await page.getByRole("checkbox", { name: "B", exact: true }).check();
  await page.screenshot({ path: info.outputPath("config.png"), fullPage: true });
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  const geometry = page.getByTestId("factorial-geometry");
  await geometry.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.screenshot({ path: info.outputPath("result.png"), fullPage: true });
  await expect(geometry).toContainText("Posto 4 de 6 parâmetros; 8 de 8 linhas usadas.");
  await expect(geometry).toContainText("Há confundimento");
  await expect(geometry).toContainText("Direções de confundimento (2)");
  // Com a interação e a célula a1·b3 vazia: a família de A não tem médias estimáveis, a diferença
  // marginal b2 − b3 depende da célula vazia, mas a2·b2 − a2·b3 (= 4) é identificada.
  await expect(page.getByText("Esta família não tem médias individuais estimáveis")).toBeVisible();
  await expect(page.getByRole("row", { name: /^b2 − b3 / })).toContainText("n.e.");
  const identified = page.getByRole("row", { name: /^a2 · b2 − a2 · b3 / });
  await expect(identified).toContainText("4");
  await expect(identified).not.toContainText("n.e.");

  // Seis temas × PT/EN, em 1064 e 375 px: sem estouro horizontal da página e sem violações do axe,
  // com os detalhes do diagnóstico abertos.
  await geometry.locator("details > summary").evaluateAll((items) => {
    for (const item of items) (item.parentElement as HTMLDetailsElement).open = true;
  });
  const texts = {
    "pt-BR": "Direções de confundimento (2)",
    en: /Confounding directions \(2\)/,
  } as const;
  for (const theme of THEME_LIST) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    for (const language of ["pt-BR", "en"] as const) {
      await page.locator("header.app-header select").first().selectOption(language);
      await page.evaluate(() => document.fonts.ready);
      await expect(geometry).toContainText(texts[language]);
      if (language === "en") await expect(geometry).toContainText("Rank 4 of 6 parameters");
      for (const width of [375, 1064]) {
        await page.setViewportSize({ width, height: 892 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        expect(overflow, `${theme}/${language}/${width}`).toBeLessThanOrEqual(0);
      }
      await page.setViewportSize({ width: 1064, height: 892 });
      const axe = await new AxeBuilder({ page })
        .include('[data-testid="factorial-geometry"]')
        .analyze();
      expect(
        axe.violations.map((v) => v.id),
        `${theme}/${language}`,
      ).toEqual([]);
      await geometry.screenshot({ path: info.outputPath(`geometry-${theme}-${language}.png`) });
    }
  }
});
