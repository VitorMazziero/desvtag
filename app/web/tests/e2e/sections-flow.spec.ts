import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

// Resultados em seções com barra lateral e seleção de modelos (ET11), com o motor WASM real.

const example = fileURLToPath(
  new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
);

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByTestId("results-layout")).toBeVisible();
}

const parameters = (page: Page, column: number) =>
  page
    .getByTestId("model-compare")
    .getByRole("row", { name: /Parâmetros/ })
    .getByRole("cell")
    .nth(column)
    .textContent();

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("resultados em seções", () => {
  test("barra lateral: uma seção por vez, exportação por último, teclado e mostrar tudo", async ({
    page,
  }) => {
    await openExample(page);
    const nav = page.getByRole("navigation", { name: "Seções dos resultados" });
    await expect(nav).toBeVisible();
    const buttons = nav.getByRole("button");
    const names = await buttons.allTextContents();
    expect(names.slice(0, 2)).toEqual(["Resumo", "Modelo"]);
    expect(names).toContain("Otimização por desejabilidade");
    expect(names.at(-1)).toBe("Exportar");

    // Só a seção ativa (Resumo) aparece: a tabela de termos e a otimização ficam ocultas.
    await expect(buttons.first()).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("interpretation")).toBeVisible();
    await expect(page.getByTestId("surface-terms")).toBeHidden();
    await expect(page.getByTestId("optimization-panel")).toBeHidden();

    // Teclado: seta para baixo vai à próxima seção.
    await buttons.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(buttons.nth(1)).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("surface-terms")).toBeVisible();
    await expect(page.getByTestId("interpretation")).toBeHidden();

    // Otimização é uma seção própria; a exportação reúne tabelas, relatório e preferências.
    await page.getByTestId("section-optimization").click();
    await expect(page.getByTestId("optimization-panel")).toBeVisible();
    await expect(page.getByTestId("export-panel")).toBeHidden();
    await page.getByTestId("section-export").click();
    await expect(page.getByTestId("export-panel")).toBeVisible();
    await expect(page.getByRole("button", { name: "Coeficientes (CSV)" })).toBeVisible();

    // "Mostrar todas as seções" restaura a página única e é lembrado.
    await page.getByTestId("show-all-sections").check();
    await expect(page.getByTestId("interpretation")).toBeVisible();
    await expect(page.getByTestId("optimization-panel")).toBeVisible();
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem("optima.showAllSections"))).toBe("1");
  });

  test("seleção de modelos: desligar um termo recalcula e a recomendação é aplicável e reversível", async ({
    page,
  }) => {
    await openExample(page);
    await page.getByTestId("section-model").click();
    const panel = page.getByTestId("model-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("model-compare")).toBeVisible();
    const full = Number(await parameters(page, 0));
    expect(Number(await parameters(page, 1))).toBe(full);

    // Desliga um termo (qualquer quadrático): o modelo atual passa a ter um parâmetro a menos
    // e a tabela de termos acompanha.
    const rowsBefore = await page.getByTestId("surface-terms").locator("tbody tr").count();
    await panel.getByRole("checkbox", { name: /²/ }).first().uncheck();
    await expect.poll(async () => Number(await parameters(page, 1))).toBe(full - 1);
    await expect(page.getByTestId("surface-terms").locator("tbody tr")).toHaveCount(rowsBefore - 1);

    // A sequência sugerida e a comparação (completo × atual × recomendado) estão presentes.
    await expect(page.getByTestId("model-sequence")).toBeVisible();
    await expect(page.getByTestId("model-compare")).toContainText("AICc");
    await expect(page.getByTestId("model-compare")).toContainText("R² predito");

    // Voltar ao modelo completo restaura os termos.
    await panel.getByRole("button", { name: "Voltar ao modelo completo" }).click();
    await expect.poll(async () => Number(await parameters(page, 1))).toBe(full);
    await expect(page.getByTestId("surface-terms").locator("tbody tr")).toHaveCount(rowsBefore);

    // Aplicar a recomendação (quando há alguma): o modelo atual passa a ser o recomendado.
    const apply = page.getByTestId("apply-recommendation");
    if (await apply.isEnabled()) {
      const recommended = await parameters(page, 2);
      await apply.click();
      await expect.poll(async () => await parameters(page, 1)).toBe(recommended);
    }
  });
});
