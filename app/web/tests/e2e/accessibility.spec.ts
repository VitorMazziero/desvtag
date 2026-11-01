import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// Varredura automática de acessibilidade (axe-core, regras WCAG 2.x A/AA) em cada etapa do fluxo
// e em cada tema. Não substitui a verificação manual com leitor de tela.

async function scan(page: Page, where: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(summary, `violações de acessibilidade em ${where}`).toEqual([]);
}

for (const theme of ["soft-light", "modern-dark", "professional"] as const) {
  test(`axe: fluxo completo sem violações no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
    await scan(page, `${theme}/objetivo`);

    await page
      .getByRole("radio", { name: /Analyze existing data|Analisar dados existentes/ })
      .check();
    await page.getByRole("button", { name: /Next|Avançar/ }).click();
    await page.getByRole("button", { name: /Add factor|Adicionar fator/ }).click();
    await page
      .getByLabel(/^(Name|Nome)$/)
      .first()
      .fill("Condition");
    await page.getByRole("button", { name: /Add response|Adicionar resposta/ }).click();
    await page
      .getByLabel(/^(Name|Nome)$/)
      .nth(1)
      .fill("Activity");
    await scan(page, `${theme}/fatores-e-respostas`);

    await page.getByRole("button", { name: /Next|Avançar/ }).click();
    await page.getByRole("button", { name: /Add row|Adicionar linha/ }).click();
    await page
      .getByLabel(/Activity — /)
      .first()
      .fill("abc");
    await scan(page, `${theme}/dados-com-erro`);
    await page
      .getByLabel(/Activity — /)
      .first()
      .fill("1,5");

    await page.getByRole("button", { name: /Next|Avançar/ }).click();
    await scan(page, `${theme}/analise`);
    await page.getByRole("button", { name: /Calculate summary|Calcular resumo/ }).click();
    await page.getByTestId("descriptive-table").waitFor();
    await scan(page, `${theme}/resultados`);
  });
}

test("axe: controle negativo — o verificador detecta violações conhecidas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
  await page.evaluate(() => {
    const bad = document.createElement("div");
    bad.innerHTML = '<img src="x.png"><input type="text"><button></button>';
    document.querySelector("main")?.append(bad);
  });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const ids = results.violations.map((v) => v.id);
  expect(ids).toEqual(expect.arrayContaining(["image-alt", "label", "button-name"]));
});

test("axe: assistente de importação e aviso de recuperação sem violações", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
  await page
    .getByRole("radio", { name: /Analyze existing data|Analisar dados existentes/ })
    .check();
  await page.getByRole("button", { name: /Next|Avançar/ }).click();
  await page.getByRole("button", { name: /Add response|Adicionar resposta/ }).click();
  await page
    .getByLabel(/^(Name|Nome)$/, { exact: true })
    .first()
    .fill("y");
  await page.getByRole("button", { name: /Next|Avançar/ }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Import file|Importar arquivo/ }).click();
  await (await chooser).setFiles("tests/fixtures/dados-ptbr.csv");
  await expect(page.getByTestId("import-wizard")).toBeVisible();
  await scan(page, "assistente de importação");

  // Recuperação: aguarda a gravação e recarrega para exibir o aviso.
  await page.getByRole("button", { name: /Cancel|Cancelar/ }).click();
  await page.getByRole("button", { name: /Add row|Adicionar linha/ }).click();
  await expect(page.getByTestId("status-recovery")).toHaveAttribute("data-state", "saved", {
    timeout: 6000,
  });
  await page.reload();
  await expect(page.getByTestId("recovery-banner")).toBeVisible();
  await scan(page, "aviso de recuperação");
});
