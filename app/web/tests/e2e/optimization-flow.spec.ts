import { expect, type Page, test } from "@playwright/test";

// Otimização por desejabilidade com o motor Rust real (WebAssembly): abrir o exemplo 04, conferir os
// candidatos, os limites obrigatórios, o domínio estendido, o cancelamento e o experimento de
// confirmação vinculado.

const example = new URL(
  "../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag",
  import.meta.url,
).pathname;

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Otimização do meio de cultivo");
  await expect(page.getByTestId("optimization-panel")).toBeVisible();
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("otimização por desejabilidade", () => {
  test("exemplo 04: candidato, previsões com intervalo, compromisso e gráfico (conferidos de forma independente)", async ({
    page,
  }) => {
    await openExample(page);
    // Busca exaustiva independente (NumPy): D = 0,9254 em torno de (31,3; 6,21; 1,26); o motor refina.
    const table = page.getByTestId("candidate-table").first();
    await expect(table.locator("tbody tr").first()).toContainText("0,9255");
    await expect(table.locator("tbody tr").first()).toContainText("31,448");
    await expect(table.locator("tbody tr").first()).toContainText("121,47");
    await expect(table.locator("tbody tr").first()).toContainText("40 início(s)");
    await expect(page.getByTestId("optimization-status")).toContainText("candidatos viáveis");
    // Nenhuma afirmação de ótimo global e a recomendação de confirmar.
    await expect(
      page.getByText("não prova que o melhor candidato seja o ótimo global"),
    ).toBeVisible();
    await expect(page.getByTestId("tradeoff-table")).toContainText("Subproduto");
    await expect(page.getByTestId("convergence")).toContainText("40 inícios");
    await expect(page.getByTestId("desirability-chart")).toBeVisible();
    await expect(page.getByText("Os dados ou a configuração mudaram")).toHaveCount(0);
  });

  test("limite obrigatório inatingível: região inviável sem candidatos; estender o domínio marca extrapolação", async ({
    page,
  }) => {
    await openExample(page);
    await page
      .getByLabel("Atividade enzimática — Limite obrigatório: previsto no mínimo")
      .fill("500");
    await expect(page.getByText("Os dados ou a configuração mudaram")).toBeVisible();
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByTestId("optimization-status")).toContainText(
      "Nenhum ponto da região satisfaz",
    );
    await expect(page.getByTestId("candidate-table")).toHaveCount(0);
    // Volta a um limite viável e estende o domínio (extrapolação por escolha explícita).
    await page
      .getByLabel("Atividade enzimática — Limite obrigatório: previsto no mínimo")
      .fill("105");
    await page.getByLabel(/Estender os limites dos fatores/).check();
    await page.getByLabel("Glicose — Limite superior").fill("80");
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByTestId("candidate-table").first()).toBeVisible();
    await expect(page.getByTestId("optimization-result")).toContainText(
      "Fora da região experimental",
    );
  });

  test("objetivos inválidos são recusados pelo motor com mensagem localizada", async ({ page }) => {
    await openExample(page);
    await page.getByLabel("Atividade enzimática — Alvo").fill("90"); // alvo abaixo do mínimo aceitável (100)
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Objetivo inválido" })).toBeVisible();
  });

  test("cancelar uma busca longa mantém o resultado anterior e a interface volta a funcionar", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openExample(page);
    const first = await page.getByTestId("candidate-table").first().textContent();
    await page.getByText("Opções avançadas da busca").click();
    await page.getByLabel("Número de inícios").fill("5000");
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByRole("button", { name: "Cancelar a busca" })).toBeVisible();
    await page.getByRole("button", { name: "Cancelar a busca" }).click();
    await expect(
      page.getByText("Busca cancelada; os resultados anteriores foram mantidos."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Buscar condições ótimas" })).toBeEnabled();
    // O resultado anterior continua exibido (sem nova gravação) e uma nova busca funciona.
    await expect(page.getByTestId("optimization-result")).toBeVisible();
    await page.getByLabel("Número de inícios").fill("40");
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByTestId("convergence")).toContainText("40 inícios");
    expect(await page.getByTestId("candidate-table").first().textContent()).toBe(first);
  });

  test("experimento de confirmação vinculado: previsões gravadas e conferência com o observado", async ({
    page,
  }) => {
    await openExample(page);
    await page.getByRole("button", { name: /Experimento: Confirmação/ }).click();
    const check = page.getByTestId("confirmation-check");
    await expect(check).toBeVisible();
    await expect(check.locator("tbody tr")).toHaveCount(4); // 2 ensaios × 2 respostas
    await expect(check.locator("tbody tr").first()).toContainText("121,47");
    await expect(check.locator("tbody tr").first()).toContainText("dentro do intervalo");
    // Um valor muito acima do intervalo é apontado.
    await page
      .getByRole("textbox", { name: "Atividade enzimática — Obs. 1", exact: true })
      .fill("150");
    await expect(check.locator("tbody tr").first()).toContainText("acima do intervalo");
  });

  test("percurso completo: propor confirmação cria um experimento vinculado e salva/reabre", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openExample(page);
    await page.getByLabel("Repetições por candidato").fill("3");
    await page.getByRole("button", { name: "Propor ensaios de confirmação" }).click();
    // Novo experimento (o terceiro) com 3 ensaios e as previsões gravadas.
    await expect(page.getByTestId("confirmation-check")).toBeVisible();
    await expect(page.getByTestId("confirmation-check").locator("tbody tr")).toHaveCount(6);
    const save = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = await (await save).path();
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file as string);
    await page
      .getByRole("button", { name: /Experimento: Confirmação/ })
      .last()
      .click();
    await expect(page.getByTestId("confirmation-check").locator("tbody tr")).toHaveCount(6);
  });
});
