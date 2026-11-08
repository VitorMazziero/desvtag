import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { startObjective } from "./startObjective";

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

// Estes testes verificam o comportamento PADRÃO da barra de seções (uma seção por vez): partem do
// armazenamento vazio, sem a preferência «mostrar tudo» que os demais testes recebem da configuração.
test.use({
  locale: "pt-BR",
  acceptDownloads: true,
  storageState: { cookies: [], origins: [] },
});

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
  }, info) => {
    await openExample(page);
    await page.getByTestId("section-model").click();
    const panel = page.getByTestId("model-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("model-compare")).toHaveCount(0);
    await panel.screenshot({ path: info.outputPath("comparacao-sob-demanda.png") });
    await panel.getByTestId("model-compare-action").click();
    await expect(page.getByTestId("model-compare")).toBeVisible();
    const full = Number(await parameters(page, 0));
    expect(Number(await parameters(page, 1))).toBe(full);

    // Desliga um termo (qualquer quadrático): o modelo atual passa a ter um parâmetro a menos
    // e a tabela de termos acompanha.
    const rowsBefore = await page.getByTestId("surface-terms").locator("tbody tr").count();
    await panel.getByRole("checkbox", { name: /²/ }).first().click();
    await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
    await page.getByTestId("section-model").click();
    await expect.poll(async () => Number(await parameters(page, 1))).toBe(full - 1);
    await expect(page.getByTestId("surface-terms").locator("tbody tr")).toHaveCount(rowsBefore - 1);

    // A sequência sugerida e a comparação (completo × atual × recomendado) estão presentes.
    await expect(page.getByTestId("model-sequence")).toBeVisible();
    await expect(page.getByTestId("model-compare")).toContainText("AICc");
    await expect(page.getByTestId("model-compare")).toContainText("R² predito");

    // Voltar ao modelo completo restaura os termos.
    await panel.getByRole("button", { name: "Voltar ao modelo completo" }).click();
    await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
    await page.getByTestId("section-model").click();
    await expect.poll(async () => Number(await parameters(page, 1))).toBe(full);
    await expect(page.getByTestId("surface-terms").locator("tbody tr")).toHaveCount(rowsBefore);

    // Aplicar a recomendação (quando há alguma): o modelo atual passa a ser o recomendado.
    const apply = page.getByTestId("apply-recommendation");
    if (await apply.isEnabled()) {
      const recommended = await parameters(page, 2);
      await apply.click();
      await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
      await page.getByTestId("section-model").click();
      await expect.poll(async () => await parameters(page, 1)).toBe(recommended);
    }
  });
});

test("comparação de um fator em seções: resumo primeiro, gráficos à parte e exportação por último", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await startObjective(page, "compare");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  // Percurso guiado: as respostas ficam no bloco seguinte («Seguir»).
  await expect(page.getByTestId("variables-blocks")).toHaveAttribute("data-mode", "guided");
  await expect(page.getByRole("button", { name: "Adicionar resposta" })).toBeHidden();
  await page.getByTestId("variables-blocks-next").click();
  await expect(page.getByRole("button", { name: "Adicionar fator" })).toBeHidden();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2].map((v) => ["A", v]),
    ...[12.0, 12.4, 11.8, 12.1].map((v) => ["B", v]),
    ...[15.0, 15.3, 14.8, 15.1].map((v) => ["C", v]),
  ];
  await page.getByLabel("Condição — Obs. 1", { exact: true }).evaluate(
    (el, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    },
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByTestId("analysis-factor-analysis-factor").click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByTestId("analysis-run-analysis-run").click();
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();

  const nav = page.getByRole("navigation", { name: "Seções dos resultados" });
  await expect(nav).toBeVisible();
  const names = await nav.getByRole("button").allTextContents();
  expect(names.at(0)).toBe("Resumo");
  expect(names.at(-1)).toBe("Exportar");
  // Só o resumo aparece de início: a tabela, o gráfico e o painel de exportação ficam em suas seções.
  await expect(page.getByTestId("interpretation")).toBeVisible();
  await expect(page.getByTestId("anova-table")).toBeHidden();
  await expect(page.getByTestId("means-chart")).toBeHidden();
  await page.getByTestId("section-charts").click();
  await expect(page.getByTestId("means-chart")).toBeVisible();
  await page.getByTestId("section-tables").click();
  await expect(page.getByTestId("anova-table")).toBeVisible();
  await page.getByTestId("section-export").click();
  await expect(page.getByTestId("report-pdf-button")).toBeVisible();
  // A seção ativa fica lembrada no dispositivo (vale ao recarregar a página).
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).some(
        (key) =>
          key.startsWith("optima.activeSection.") && sessionStorage.getItem(key) === "export",
      ),
    ),
  ).toBe(true);
});

test("um modelo por resposta: cada resposta guarda o seu e a troca é imediata", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const kla = fileURLToPath(
    new URL("../../../../examples/06-kla-sintetico/projeto.enzitag", import.meta.url),
  );
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(kla);
  await expect(page.getByTestId("results-layout")).toBeVisible();
  await page.getByTestId("section-model").click();
  await page.getByTestId("model-compare-action").click();
  const select = page.getByTestId("model-response");
  await expect(select).toHaveValue("r1");
  // kLa guarda o modelo recomendado (intercepto, RPM, aeração e RPM²): 4 parâmetros.
  await expect.poll(async () => Number(await parameters(page, 1))).toBe(4);
  // A potência ainda não tem modelo escolhido: usa o completo (6 parâmetros).
  await select.selectOption({ label: "Potência" });
  await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("section-model").click();
  await expect.poll(async () => Number(await parameters(page, 1))).toBe(6);
  // Voltar ao kLa traz o modelo reduzido de novo.
  await select.selectOption({ label: "kLa" });
  await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
  await page.getByTestId("section-model").click();
  await expect.poll(async () => Number(await parameters(page, 1))).toBe(4);
});
