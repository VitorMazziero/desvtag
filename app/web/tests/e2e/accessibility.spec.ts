import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { clickAfterFocus } from "./clickAfterFocus";
import { expectedVersion } from "./expectedVersion";
import { showAllSections } from "./showAll";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.beforeEach(async ({ page }) => {
  await showAllSections(page);
});

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

for (const theme of THEME_LIST) {
  test(`axe: fluxo completo sem violações no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
    await scan(page, `${theme}/objetivo`);

    await startObjective(page, "analyze");
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
    await clickAfterFocus(page.getByRole("button", { name: /Add row|Adicionar linha/ }));
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
  await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
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
  await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
  await startObjective(page, "analyze");
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

for (const theme of THEME_LIST) {
  test(`axe: comparação de tratamentos (configuração, tabelas e gráficos) no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
    await startObjective(page, "compare");
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
    await page.getByRole("button", { name: /Next|Avançar/ }).click();
    await clickAfterFocus(page.getByRole("button", { name: /Add row|Adicionar linha/ }));
    await page
      .getByLabel(/Condition — Obs. 1/)
      .first()
      .evaluate((el) => {
        const data = new DataTransfer();
        data.setData(
          "text/plain",
          "A\t1.0\nA\t1.2\nA\t0.9\nB\t2.0\nB\t2.2\nB\t1.9\nC\t3.0\nC\t3.1\nC\t2.8\n",
        );
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: data });
        el.dispatchEvent(event);
      });
    await page.getByRole("button", { name: /Next|Avançar/ }).click();
    await scan(page, `${theme}/comparacao-configuracao`);
    await page
      .getByRole("combobox", { name: /Factor that defines|Fator que define/ })
      .selectOption({ index: 1 });
    await page.getByRole("button", { name: /Compare treatments|Comparar tratamentos/ }).click();
    await page.getByTestId("anova-table").waitFor();
    await scan(page, `${theme}/comparacao-resultados`);
  });
}

for (const theme of THEME_LIST) {
  test(`axe: planejamento, matriz e resultados de triagem sem violações no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Open…|Abrir…/ }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL("../../../../examples/02-triagem-meio-cultivo/projeto.enzitag", import.meta.url),
      ),
    );
    await page.getByTestId("effects-table").waitFor();
    await scan(page, `${theme}/resultados-de-triagem`);
    await page.getByRole("button", { name: /Design and data|Planejamento e dados/ }).click();
    await page.getByTestId("matrix-table").waitFor();
    await scan(page, `${theme}/planejamento-e-matriz`);
  });
}

for (const theme of THEME_LIST) {
  test(`axe: superfície de resposta (resultados, gráficos e planejamento de superfície) sem violações no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Open…|Abrir…/ }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL("../../../../examples/03-superficie-meio-cultivo/projeto.enzitag", import.meta.url),
      ),
    );
    await page.getByTestId("surface-terms").waitFor();
    await page.getByTestId("contour-chart").waitFor();
    await page.getByTestId("surface-chart").waitFor();
    await scan(page, `${theme}/resultados-da-superficie`);
    await page.getByRole("button", { name: /Design and data|Planejamento e dados/ }).click();
    await page.getByTestId("surface-options").waitFor();
    await scan(page, `${theme}/planejamento-de-superficie`);
  });
}

for (const theme of THEME_LIST) {
  test(`axe: otimização, candidatos e conferência da confirmação sem violações no tema ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText(expectedVersion);
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Open…|Abrir…/ }).click();
    await (await chooser).setFiles(
      fileURLToPath(
        new URL(
          "../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag",
          import.meta.url,
        ),
      ),
    );
    await page.getByTestId("candidate-table").first().waitFor();
    await page.getByTestId("rebuild-desirability-grid").press("Enter");
    await page.getByTestId("desirability-chart").waitFor();
    await scan(page, `${theme}/otimizacao`);
    await page.getByLabel(/Active experiment|Experimento ativo/).selectOption("e2");
    await page.getByTestId("confirmation-check").waitFor();
    await scan(page, `${theme}/conferencia-da-confirmacao`);
  });
}
