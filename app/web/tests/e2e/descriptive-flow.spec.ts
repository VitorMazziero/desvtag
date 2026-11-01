import { expect, type Page, test } from "@playwright/test";

// Percurso completo com o motor Rust real (WebAssembly em Worker):
// Objetivo → Fatores e respostas → Dados (colagem do Excel) → Análise → Resultados.

// Colar do Excel: o clipboard real do sistema não é controlável de forma igual em todos os
// navegadores; o evento `paste` é entregue ao tratador real da aplicação com `clipboardData`
// definido explicitamente (o construtor de ClipboardEvent ignora esse campo no Firefox).
async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

test.describe("fluxo guiado em português", () => {
  test.use({ locale: "pt-BR" });

  test("digitar, colar, agrupar e obter o resumo descritivo", async ({ page }) => {
    await page.goto("/");

    // Objetivo: o aviso de disponibilidade vem do registro de métodos do motor.
    await expect(page.getByRole("group", { name: "O que você quer fazer?" })).toBeVisible();
    await expect(page.getByText("Disponível nesta versão")).toBeVisible();
    await expect(page.getByText(/Parcial.*planejamento/)).toBeVisible();
    await expect(page.getByText(/Parcial.*comparação/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Avançar" })).toBeDisabled();
    await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();

    // Fatores e respostas definidos pelo usuário.
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
    await page.getByLabel("Níveis (opcional)").fill("A; B; C");
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByLabel("Unidade (opcional)").nth(1).fill("U/mL");
    await page.getByRole("button", { name: "Avançar" }).click();

    // Dados: uma linha criada, depois colagem estilo Excel (tabulação), com vírgula decimal e célula vazia.
    await page.getByRole("button", { name: "Adicionar linha" }).click();
    await paste(page, "Condição — Obs. 1", "A\t10,5\nA\t11,5\nB\t20\nB\t\nC\t5\nC\t7\n");
    await expect(page.getByLabel("Atividade — Obs. 3")).toHaveValue("20");
    await expect(page.getByLabel("Atividade — Obs. 4")).toHaveValue("");

    // Erro por célula bloqueia o avanço e é corrigível.
    await page.getByLabel("Atividade — Obs. 2").fill("onze");
    await expect(page.getByText("Não é um número")).toBeVisible();
    await expect(page.getByRole("button", { name: "Avançar" })).toBeDisabled();
    await page.getByLabel("Atividade — Obs. 2").fill("11,5");
    await expect(page.getByText("Não é um número")).toHaveCount(0);
    await page.getByRole("button", { name: "Avançar" }).click();

    // Análise agrupada por Condição.
    await page.getByLabel("Condição").check();
    await page.getByRole("button", { name: "Calcular resumo" }).click();

    // Resultados: conferência numérica (A: 10,5 e 11,5; B: 20 e ausente; C: 5 e 7).
    const table = page.getByTestId("descriptive-table");
    const rowA = table.getByRole("row", { name: /Condição: A/ });
    await expect(rowA).toContainText("11"); // média
    await expect(rowA).toContainText("0,5"); // variância
    await expect(rowA).toContainText("0,7071067812"); // desvio-padrão, 10 algarismos significativos
    const rowB = table.getByRole("row", { name: /Condição: B/ });
    await expect(rowB).toContainText("20");
    await expect(rowB).toContainText(
      "A variância amostral exige ao menos duas observações válidas",
    );
    const rowC = table.getByRole("row", { name: /Condição: C/ });
    await expect(rowC).toContainText("6");
    await expect(rowC).toContainText("2");
    const overall = table.getByRole("row", { name: /Todas as observações/ });
    await expect(overall.getByRole("cell").nth(0)).toHaveText("5"); // n válido
    await expect(overall.getByRole("cell").nth(1)).toHaveText("1"); // ausentes

    const interpretation = page.getByTestId("interpretation");
    await expect(interpretation).toContainText("5 de 6 observações");
    await expect(interpretation).toContainText("ainda não entregue");
    await expect(interpretation).toContainText("não presume que elas sejam réplicas independentes");
    await expect(interpretation).toContainText("O grupo «B» tem 1 observação");

    // Trocar o idioma preserva o resultado e muda rótulos e separador decimal.
    await page.getByLabel("Idioma").selectOption("en");
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(rowA).toContainText("0.7071067812");
    await expect(page.getByTestId("interpretation")).toContainText("5 of 6 observations");

    // O mesmo vale para o tema: dados, resultado e idioma permanecem.
    await page.getByLabel("Theme").selectOption("modern-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "modern-dark");
    await expect(rowA).toContainText("0.7071067812");
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();

    // Alterar um dado invalida o resultado: a etapa de resultados fica bloqueada.
    await page.getByRole("button", { name: /Design and data/ }).click();
    await page.getByLabel("Atividade — Obs. 1").fill("99");
    await expect(page.getByRole("button", { name: /^Results/ })).toBeDisabled();
  });
});

test.describe("guided flow in English", () => {
  test.use({ locale: "en-US" });

  test("summarizes a response without factors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Analyze existing data/ }).check();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Add response" }).click();
    await page.getByLabel("Name", { exact: true }).first().fill("Yield");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Add factors and responses in the previous step")).toHaveCount(0);
    await page.getByRole("button", { name: "Add row" }).click();
    await paste(page, "Yield — Obs. 1", "2\n4\n4\n4\n5\n5\n7\n9\n");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Calculate summary" }).click();
    const overall = page
      .getByTestId("descriptive-table")
      .getByRole("row", { name: /All observations/ });
    await expect(overall).toContainText("5"); // mean
    await expect(overall).toContainText("4.571428571"); // 32/7 with 10 significant digits
    await expect(page.getByTestId("interpretation")).toContainText("8 of 8 observations");
  });

  test("is operable by keyboard from the first step", async ({ page }) => {
    await page.goto("/");
    const analyze = page.getByRole("radio", { name: /Analyze existing data/ });
    await analyze.focus();
    await page.keyboard.press("Space");
    await expect(analyze).toBeChecked();
    await page.getByRole("button", { name: "Next" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Factors and responses" })).toBeVisible();
  });
});
