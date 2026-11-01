import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

// Percurso de planejamento com o motor Rust real (WebAssembly): escolher → contar → gerar →
// preencher respostas → analisar (efeitos, curvatura, Pareto) → exportar → salvar → reabrir.

async function paste(page: Page, label: string, text: string) {
  await page.getByRole("textbox", { name: label, exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function addNumericFactor(page: Page, index: number, name: string, unit: string) {
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(index).fill(name);
  await page.getByLabel("Tipo").nth(index).selectOption("numeric");
  await page.getByLabel("Unidade (opcional)").nth(index).fill(unit);
}

async function startPlanning(page: Page, factors: Array<[string, string]>) {
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, [name, unit]] of factors.entries()) await addNumericFactor(page, i, name, unit);
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(factors.length).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
}

async function setLevels(page: Page, name: string, low: string, high: string) {
  await page.getByLabel(`${name} — Nível baixo`).fill(low);
  await page.getByLabel(`${name} — Nível alto`).fill(high);
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("planejamento fatorial 2³ com pontos centrais", () => {
  test("contar, gerar, preencher, analisar, exportar e reabrir", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await startPlanning(page, [
      ["Temperatura", "°C"],
      ["pH", ""],
      ["Tempo", "min"],
    ]);

    // Sem níveis ainda: nada a contar e o botão fica desabilitado.
    await expect(page.getByTestId("design-panel")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerar planejamento" })).toBeDisabled();
    await setLevels(page, "Temperatura", "30", "50");
    await setLevels(page, "pH", "5", "7");
    await setLevels(page, "Tempo", "10", "30");

    // Recomendação do motor (3 fatores): fatorial completo de 8 ensaios; contagem antes de gerar.
    await expect(page.getByText(/recomendado/)).toBeVisible();
    await page.getByLabel("Pontos centrais").fill("3");
    await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
    await expect(page.getByTestId("run-count")).toContainText(
      "Total: 11 ensaios (8 do planejamento × 1 + 3 centrais)",
    );

    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("design-generated")).toContainText("11 ensaios");
    const matrix = page.getByTestId("matrix-table");
    await expect(matrix.locator("tbody tr")).toHaveCount(11);
    // Ordem padrão: primeiro fator varia mais depressa; centrais ao final com valores reais no meio.
    await expect(matrix.locator("tbody tr").nth(0)).toContainText("30");
    await expect(matrix.locator("tbody tr").nth(1)).toContainText("50");
    await expect(matrix.locator("tbody tr").nth(8)).toContainText("central");
    await expect(matrix.locator("tbody tr").nth(8)).toContainText("40");
    await page.getByLabel("Valores").selectOption("coded");
    await expect(matrix.locator("tbody tr").nth(0)).toContainText("-1");

    // Matriz em CSV com a semente e o algoritmo registrados.
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar matriz (CSV)" }).click();
    const csv = readFileSync((await (await csvDownload).path()) as string, "utf8");
    expect(csv).toContain("# randomized: false");
    expect(csv).toContain("# method: two_level_design v1");
    expect(csv).toContain("run,standard_order,point,replicate,Temperatura,pH,Tempo");

    // A grade recebeu os 11 ensaios (valores reais) para preencher as respostas.
    await expect(page.getByLabel("Temperatura — Obs. 2")).toHaveValue("50");
    // Respostas: y = 50 + 3A + 2B + 1AB (A, B codificados) + ruído fixo; centrais com +1,5 de curvatura.
    const noise = [0.12, -0.08, 0.05, -0.1, 0.07, -0.04, 0.09, -0.06, 0.02, -0.03, 0.04];
    const coded = (i: number) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1];
    const y = Array.from({ length: 11 }, (_, i) => {
      if (i >= 8) return 51.5 + (noise[i] as number);
      const [a, b] = coded(i) as [number, number, number];
      return 50 + 3 * a + 2 * b + 1 * a * b + (noise[i] as number);
    });
    await paste(page, "Atividade — Obs. 1", y.map((v) => String(v).replace(".", ",")).join("\n"));
    await expect(page.getByLabel("Atividade — Obs. 11")).toHaveValue(
      String(y[10]).replace(".", ","),
    );
    await page.getByRole("button", { name: "Avançar" }).click();

    // Análise: principais + interações de dois fatores, com curvatura.
    await expect(
      page.getByRole("heading", { name: "Análise: planejamento de dois níveis" }),
    ).toBeVisible();
    await page.getByLabel("Efeitos principais e interações de dois fatores").check();
    await page.getByRole("button", { name: "Analisar planejamento" }).click();

    const effects = page.getByTestId("effects-table");
    await expect(effects).toBeVisible();
    // Efeito = diferença das médias dos níveis alto e baixo (calculada aqui de forma independente).
    const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const factorial = y.slice(0, 8);
    const effectOf = (f: (i: number) => number) =>
      mean(factorial.filter((_, i) => f(i) > 0)) - mean(factorial.filter((_, i) => f(i) < 0));
    const effectA = effectOf((i) => coded(i)[0] as number);
    const shown = new Intl.NumberFormat("pt-BR", {
      maximumSignificantDigits: 5,
      useGrouping: false,
    }).format(effectA);
    // Linha 0 = intercepto; linha 1 = Temperatura.
    await expect(effects.locator("tbody tr").nth(1)).toContainText(shown);
    // Coeficiente e efeito são colunas distintas; o efeito é o dobro do coeficiente.
    await expect(effects).toContainText("Coeficiente");
    await expect(effects).toContainText("Efeito (2 × coeficiente)");

    await expect(page.getByTestId("curvature")).toContainText("pontos centrais");
    await expect(page.getByTestId("design-anova")).toBeVisible();
    await expect(page.getByTestId("lack-of-fit")).toBeVisible();
    await expect(page.getByTestId("interpretation")).toContainText("não verifica independência");
    await expect(page.getByTestId("pareto-chart")).toContainText("t crítico");
    await expect(page.getByTestId("main-effects-chart").locator("svg")).toHaveAttribute(
      "role",
      "img",
    );
    await expect(page.getByTestId("interaction-chart")).toBeVisible();
    await expect(page.getByTestId("observed-predicted-chart")).toBeVisible();

    // Exportações com proveniência.
    const effectsCsv = page.waitForEvent("download");
    await page.getByRole("button", { name: "Efeitos (CSV)" }).click();
    const text = readFileSync((await (await effectsCsv).path()) as string, "utf8");
    expect(text).toContain("# methodId: two_level_design_analysis");
    expect(text).toContain("term,order,coefficient,effect");
    const svgDownload = page.waitForEvent("download");
    await page
      .getByTestId("pareto-chart")
      .getByRole("button", { name: /Figura — SVG/ })
      .click();
    const svg = readFileSync((await (await svgDownload).path()) as string, "utf8");
    expect(svg).toContain("<metadata>");
    expect(svg).toContain("two_level_design_analysis");

    // Salvar → editar → abrir: o planejamento e o resultado voltam sem recálculo.
    const saveDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = await (await saveDownload).path();
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await page.getByRole("textbox", { name: "Atividade — Obs. 1", exact: true }).fill("99");
    page.once("dialog", (d) => d.accept());
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file as string);
    await expect(page.getByTestId("effects-table")).toBeVisible();
    await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await expect(page.getByTestId("run-matrix")).toBeVisible();
    await expect(page.getByTestId("matrix-table").locator("tbody tr")).toHaveCount(11);
  });
});

test.describe("fracionário e Plackett–Burman", () => {
  test("fracionário 2^(4−1): resolução IV e confundimento exibidos", async ({ page }) => {
    await startPlanning(page, [
      ["A1", ""],
      ["B1", ""],
      ["C1", ""],
      ["D1", ""],
    ]);
    for (const n of ["A1", "B1", "C1", "D1"]) await setLevels(page, n, "0", "1");
    // Orçamento de 8 ensaios: o motor recomenda o fracionário de resolução IV.
    await page.getByLabel("Orçamento máximo de ensaios (opcional)").fill("8");
    await expect(page.getByText(/resolução 4.*recomendado/)).toBeVisible();
    await expect(page.getByTestId("run-count")).toContainText("Total: 8 ensaios");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("design-resolution")).toContainText("Resolução 4");
    await expect(page.getByTestId("defining-relation")).toContainText("I = ABCD");
    await expect(page.getByTestId("alias-list")).toContainText("A +BCD");
    await expect(page.getByTestId("alias-list")).toContainText("AB +CD");
  });

  test("Plackett–Burman de 12 ensaios com 5 fatores: colunas fictícias e aviso de triagem", async ({
    page,
  }) => {
    await startPlanning(page, [
      ["F1", ""],
      ["F2", ""],
      ["F3", ""],
      ["F4", ""],
      ["F5", ""],
      ["F6", ""],
      ["F7", ""],
      ["F8", ""],
    ]);
    for (const n of ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"])
      await setLevels(page, n, "-1", "1");
    await page.getByLabel("Orçamento máximo de ensaios (opcional)").fill("12");
    await expect(page.getByText(/Plackett–Burman — 12 ensaios.*recomendado/)).toBeVisible();
    await page.getByLabel("Pontos centrais").fill("4");
    await expect(page.getByTestId("run-count")).toContainText("Total: 16 ensaios");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("design-properties")).toContainText("3 colunas fictícias");
    await expect(page.getByTestId("design-properties")).toContainText("correlação absoluta máxima");
  });

  test("limites: mais ensaios que o máximo é recusado com explicação, sem gerar", async ({
    page,
  }) => {
    await startPlanning(page, [
      ["X1", ""],
      ["X2", ""],
    ]);
    await setLevels(page, "X1", "0", "1");
    await setLevels(page, "X2", "0", "1");
    await page.getByLabel("Repetições do planejamento").fill("50");
    await page.getByLabel("Pontos centrais").fill("50");
    await expect(page.getByTestId("run-count")).toContainText("Total: 250 ensaios");
    // Níveis inválidos bloqueiam a geração e dizem por quê.
    await setLevels(page, "X1", "5", "5");
    await expect(
      page.getByRole("alert").filter({ hasText: "nível baixo precisa ser menor" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Gerar planejamento" })).toBeDisabled();
  });
});

test("abre o exemplo 02 (triagem Plackett–Burman) com os efeitos conferidos de forma independente", async ({
  page,
}) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/02-triagem-meio-cultivo/projeto.enzitag", import.meta.url),
    ),
  );
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Triagem de meio de cultivo");
  const effects = page.getByTestId("effects-table");
  await expect(effects).toBeVisible();
  // Efeitos e curvatura da regressão independente (NumPy): glicose 4,2833; curvatura 11 (coef. 5,5).
  await expect(effects.locator("tbody tr").nth(1)).toContainText("Glicose");
  await expect(effects.locator("tbody tr").nth(1)).toContainText("4,2833");
  await expect(effects.locator("tbody tr").nth(4)).toContainText("-2,6833");
  await expect(page.getByTestId("curvature")).toContainText("5,5");
  await expect(page.getByTestId("curvature")).toContainText("4,581");
  await expect(page.getByTestId("interpretation")).toContainText(
    "Plackett–Burman é um desenho de triagem",
  );
  await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
  // O planejamento volta com a mesma matriz: semente e 16 ensaios.
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  await expect(page.getByTestId("matrix-table").locator("tbody tr")).toHaveCount(16);
  await expect(page.getByTestId("design-properties")).toContainText("20261101");
});

test("abre o exemplo 03 (DCCR) com coeficientes, falta de ajuste e superfícies conferidos de forma independente", async ({
  page,
}) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL("../../../../examples/03-superficie-meio-cultivo/projeto.enzitag", import.meta.url),
    ),
  );
  await expect(page.getByLabel("Nome do projeto")).toHaveValue(
    "Superfície de resposta do meio de cultivo",
  );
  // Regressão independente (NumPy): Glicose 5,0158; Glicose² −5,7833; R² 0,9878; falta de ajuste p = 0,692.
  const terms = page.getByTestId("surface-terms");
  await expect(terms).toBeVisible();
  await expect(terms.locator("tbody tr").nth(1)).toContainText("Glicose");
  await expect(terms.locator("tbody tr").nth(1)).toContainText("5,0158");
  await expect(terms.locator("tbody tr").nth(4)).toContainText("-5,7833");
  await expect(page.getByTestId("fit-measures")).toContainText("0,98776");
  await expect(page.getByTestId("lack-of-fit")).toContainText("0,6918");
  await expect(page.getByTestId("equation-coded")).toContainText("119,4 + 5,0158·Glicose");
  await expect(page.getByTestId("equation-real")).toContainText("2,1753 + 3,6059·Glicose");
  await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
  // Superfície 3D e contorno vêm da malha do motor; a região extrapolada é identificada.
  await expect(page.getByTestId("contour-chart")).toBeVisible();
  await expect(page.getByTestId("surface-chart")).toBeVisible();
  await expect(page.getByTestId("contour-chart")).toContainText("Hachurado: extrapolação");
  // O planejamento volta com 19 ensaios, 6 axiais e α = 1,682.
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  await expect(page.getByTestId("matrix-table").locator("tbody tr")).toHaveCount(19);
  await expect(page.getByTestId("axial-distance")).toContainText("1,68179");
});
