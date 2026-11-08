import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { clickAfterFocus } from "./clickAfterFocus";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
});
async function importCsv(page: Page, text: string) {
  const choose = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  await (await choose).setFiles({
    name: "auditoria.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(text),
  });
}
test("UX23: nome de resposta tem prioridade sobre a última coluna numérica", async ({ page }) => {
  await page.goto("/");
  await startObjective(page, "analyze");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Tempo");
  await page.getByLabel("Tipo", { exact: true }).selectOption("numeric");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).last().fill("Biomassa");
  await importCsv(page, "Biomassa;Tempo\n1,2;0\n2,4;10\n3,6;20\n");
  await expect(page.getByLabel("Papel 1", { exact: true })).toHaveValue("response");
  await expect(page.getByLabel("Papel 2", { exact: true })).toHaveValue("factor");
});
test("UX25: fator Unidade forma pares e sai dos efeitos fixos", async ({ page }) => {
  await page.goto("/");
  await startObjective(page, "analyze");
  await importCsv(
    page,
    "Condição;Unidade;Biomassa\nAntes;U1;10\nDepois;U1;12\nAntes;U2;11\nDepois;U2;13,2\nAntes;U3;12\nDepois;U3;14,1\n",
  );
  await page.getByLabel("Papel 2", { exact: true }).selectOption("factor");
  await page.getByLabel("Tipo do fator 2", { exact: true }).selectOption("categorical");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await clickAfterFocus(page.getByTestId("data-blocks-next"));
  await page.getByLabel("Estrutura das observações").selectOption("repeated");
  await page.getByTestId("repeated-unit-source").getByRole("combobox").selectOption("f2");
  await expect(page.getByTestId("repeated-unit-summary")).toContainText("3");
  await page.getByRole("button", { name: "Comparar pares", exact: true }).click();
  await expect(page.getByTestId("paired-result")).toContainText("3 pares");
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("repeated-method").selectOption("mixed");
  // A unidade experimental não é oferecida como efeito fixo; os demais fatores continuam.
  const fixed = page.getByTestId("repeated-measures");
  await expect(fixed.getByRole("checkbox", { name: "Unidade", exact: true })).toHaveCount(0);
  await expect(fixed.getByRole("checkbox", { name: "Condição", exact: true })).toBeChecked();
});
test("UX40/UX39: mistura não estimável interpola os termos e abre Resultados", async ({ page }) => {
  await page.goto("/");
  const choose = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await choose).setFiles(
    fileURLToPath(
      new URL("../../../../examples/07-misturas-scheffe/projeto.enzitag", import.meta.url),
    ),
  );
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  await page.getByTestId("row-actions-13").locator(":scope > summary").click();
  await page.getByRole("button", { name: "Remover linha 13", exact: true }).click();
  await page.getByRole("button", { name: /^Análise/ }).click();
  await page.getByTestId("mixture-model").selectOption("specialCubic");
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await expect(page.getByTestId("scheffe-coefficients")).toBeVisible();
  await expect(page.getByTestId("saved-family-result")).not.toContainText("{{");
  await expect(page.getByTestId("saved-family-result")).toContainText(/estimáve|posto/);
  await page.getByRole("button", { name: /^Resultados/ }).click();
  await expect(page.getByTestId("scheffe-coefficients")).toBeVisible();
});
test("UX20/T19: ótimo inclui o categórico (ET25 T09) e protege as condições geradas", async ({
  page,
}) => {
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [i, name] of ["Temperatura", "Cepa"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
  }
  await page.getByLabel("Tipo", { exact: true }).nth(1).selectOption("categorical");
  await page.getByLabel("Níveis (opcional)").nth(1).fill("A; B");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).last().fill("Biomassa");
  await page.getByTestId("variables-blocks-next").click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D/ })
    .check();
  // Desde a ET25 T09 o fator categórico participa da busca: não há mais aviso de exclusão.
  await expect(page.getByTestId("optimal-excluded")).toHaveCount(0);
  await page.getByLabel("Limite baixo de Temperatura").fill("20");
  await page.getByLabel("Limite alto de Temperatura").fill("40");
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("linear");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByTestId("optimal-summary")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  await expect(page.getByLabel("Cepa — Obs. 1", { exact: true })).toHaveValue(/^[AB]$/);
  await expect(page.getByLabel("Cepa — Obs. 1", { exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByLabel("Temperatura — Obs. 1", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
});
for (const width of [800, 1920])
  for (const theme of THEME_LIST)
    test(`componentes em ${width}px no tema ${theme}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 892 });
      await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
      await page.goto("/");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath(`tema-${theme}-${width}.png`) });
      await startObjective(page, "plan");
      await page.getByRole("button", { name: "Adicionar fator" }).click();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    });

test("T16: bloqueio do planejamento abre o bloco de fatores", async ({ page }) => {
  await page.goto("/");
  await startObjective(page, "plan");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Biomassa");
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Completar os fatores →" }).click();
  await expect(
    page.getByRole("heading", { name: "Fatores e respostas", exact: true }),
  ).toBeVisible();
  await page.locator('[data-testid="show-all-blocks"]:visible').uncheck();
  await expect(page.getByTestId("variables-blocks-factors")).toHaveAttribute(
    "aria-current",
    "step",
  );
});
test("UX25: mostrar unidade volta à grade e foca a primeira célula", async ({ page }) => {
  await page.goto("/");
  await startObjective(page, "analyze");
  await importCsv(page, "Condição;Biomassa\nAntes;10\nDepois;12\nAntes;11\nDepois;13\n");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await page.getByTestId("data-blocks-next").click();
  await page.getByLabel("Estrutura das observações").selectOption("repeated");
  await page
    .getByRole("button", { name: "Mostrar a coluna «Unidade» na grade", exact: true })
    .click();
  await expect(page.getByLabel("Unidade experimental — Obs. 1", { exact: true })).toBeFocused();
});
