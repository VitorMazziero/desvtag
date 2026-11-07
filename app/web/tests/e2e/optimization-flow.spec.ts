import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { clickAfterFocus } from "./clickAfterFocus";
import { showAllSections } from "./showAll";

// Otimização por desejabilidade com o motor Rust real (WebAssembly): abrir o exemplo 04, conferir os
// candidatos, os limites obrigatórios, o domínio estendido, o cancelamento e o experimento de
// confirmação vinculado.

const example = fileURLToPath(
  new URL("../../../../examples/04-otimizacao-e-confirmacao/projeto.enzitag", import.meta.url),
);

async function openExample(page: Page) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Otimização do meio de cultivo");
  await expect(page.getByTestId("optimization-panel")).toBeVisible();
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.beforeEach(async ({ page }) => {
  await showAllSections(page);
  await page.addInitScript(() => {
    const host = window as unknown as {
      optimizationOperations: Array<{ type: string; fitted?: unknown[] }>;
    };
    host.optimizationOperations = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const request = (message as { requestJson?: string }).requestJson;
      if (request) host.optimizationOperations.push(JSON.parse(request).operation);
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

test.describe("otimização por desejabilidade", () => {
  test("histórico com amplitude extrema avisa e preserva os candidatos arquivados", async ({
    page,
  }, info) => {
    const archive = unzipSync(new Uint8Array(readFileSync(example)));
    const projectBytes = archive["project.json"];
    const manifestBytes = archive["manifest.json"];
    if (!projectBytes || !manifestBytes) throw new Error("Arquivo de teste incompleto");
    const document = JSON.parse(strFromU8(projectBytes));
    const record = document.experiments[0].analyses.find(
      (analysis: { result: { type: string } }) => analysis.result.type === "optimization",
    );
    record.options.optimization.responses[0].goal = {
      type: "maximize",
      low: -1e308,
      target: 1e308,
      shape: 1,
    };
    const encoded = strToU8(JSON.stringify(document));
    const manifest = JSON.parse(strFromU8(manifestBytes));
    manifest.files[0].sha256 = createHash("sha256").update(encoded).digest("hex");
    manifest.files[0].size = encoded.length;
    archive["project.json"] = encoded;
    archive["manifest.json"] = strToU8(JSON.stringify(manifest));
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles({
      name: "historico-extremo.enzitag",
      mimeType: "application/zip",
      buffer: Buffer.from(zipSync(archive)),
    });
    const result = page.getByTestId("optimization-result");
    const warning = result.getByText(/fórmula anterior.*limites extremos/);
    await expect(warning).toBeVisible();
    await expect(result.getByTestId("candidate-table").first()).toContainText("0,9255");
    await expect(result.getByTestId("desirability-view")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Propor ensaios de confirmação" })).toHaveCount(
      0,
    );
    await warning.screenshot({ path: info.outputPath("aviso-historico-extremo.png") });
  });
  test("exemplo 04: candidato, previsões com intervalo, compromisso e gráfico (conferidos de forma independente)", async ({
    page,
  }, info) => {
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
    await expect(page.getByTestId("desirability-chart")).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { optimizationOperations: Array<{ type: string }> }
        ).optimizationOperations.some((operation) => operation.type === "optimizationGrid"),
      ),
    ).toBe(false);
    await page
      .getByTestId("desirability-view")
      .screenshot({ path: info.outputPath("malha-historica-sob-demanda.png") });
    await clickAfterFocus(page.getByTestId("rebuild-desirability-grid"));
    await expect(page.getByTestId("desirability-chart")).toBeVisible();
    await expect(page.getByText("Os dados ou a configuração mudaram")).toHaveCount(0);
  });

  test("otimização nova reabre a malha com os coeficientes das duas respostas salvas", async ({
    page,
  }, info) => {
    await openExample(page);
    await clickAfterFocus(
      page.getByRole("button", { name: "Buscar condições ótimas", exact: true }),
    );
    await expect(page.getByTestId("desirability-chart")).toBeVisible();
    const saved = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const path = info.outputPath("desirability-with-models.enzitag");
    await (await saved).saveAs(path);
    const bytes = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
    if (!bytes) throw new Error("project.json");
    const record = JSON.parse(strFromU8(bytes)).experiments[0].analyses.at(-1);
    expect(record.result.type).toBe("optimization");
    expect(record.result.gridModels).toHaveLength(2);

    await page.reload();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(path);
    await expect(page.getByTestId("desirability-chart")).toBeVisible();
    const operations = await page.evaluate(
      () =>
        (
          window as unknown as {
            optimizationOperations: Array<{ type: string; fitted?: unknown[] }>;
          }
        ).optimizationOperations,
    );
    expect(operations.find((operation) => operation.type === "optimizationGrid")?.fitted).toEqual(
      record.result.gridModels,
    );
    expect(
      operations.filter((operation) =>
        ["optimizationRun", "surfaceAnalyze", "surfaceSelectModel"].includes(operation.type),
      ),
    ).toEqual([]);
    await page
      .getByTestId("desirability-chart")
      .screenshot({ path: info.outputPath("malha-arquivada-reaberta.png") });
  });

  test("limite obrigatório sem candidato encontrado; estender o domínio marca extrapolação", async ({
    page,
  }) => {
    await openExample(page);
    await page
      .getByLabel("Atividade enzimática — Limite obrigatório: previsto no mínimo")
      .fill("500");
    await expect(page.getByText("Os dados ou a configuração mudaram")).toBeVisible();
    await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
    await expect(page.getByTestId("optimization-status")).toContainText(
      "A busca não encontrou candidato",
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
    await page.getByLabel("Experimento ativo").selectOption("e2");
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
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const file = await (await save).path();
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file as string);
    await expect(page.getByLabel("Experimento ativo")).toHaveValue("e3");
    await expect(page.getByTestId("confirmation-check").locator("tbody tr")).toHaveCount(6);
  });
});
