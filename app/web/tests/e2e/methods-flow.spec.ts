import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Procedimentos de comparação múltipla e ANOVA multifatorial com o motor Rust real (WebAssembly).

async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function startCompare(page: Page, factors: string[]) {
  await page.goto("/");
  await page.getByRole("radio", { name: /Comparar tratamentos/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, name] of factors.entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
  }
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(factors.length).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test("Games–Howell com variâncias desiguais: ANOVA de Welch, pares, letras e gráfico", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startCompare(page, ["Condição"]);
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2, 10.0].map((v) => ["A", v]),
    ...[11.0, 14.5, 8.2, 16.1, 9.4, 13.0].map((v) => ["B", v]),
    ...[12.0, 12.2, 11.9, 12.1].map((v) => ["C", v]),
    ...[20.0, 14.0, 26.5, 9.0, 31.0].map((v) => ["D", v]),
  ];
  await paste(
    page,
    "Condição — Obs. 1",
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByTestId("procedure-select").selectOption("gamesHowell");
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();

  await expect(page.getByTestId("procedure-global")).toContainText("ANOVA de Welch");
  await expect(page.getByRole("navigation", { name: "Seções dos resultados" })).toBeVisible();
  await page.getByTestId("section-tables").click();
  await expect(page.getByTestId("procedure-pairs").locator("tbody tr")).toHaveCount(6);
  await expect(page.getByTestId("procedure-groups").locator("tbody tr")).toHaveCount(4);
  await expect(page.getByTestId("procedure-letters-0")).not.toBeEmpty();
  await page.getByTestId("section-charts").click();
  await expect(page.getByTestId("procedure-chart").locator("svg")).toBeVisible();
  // Exportação sempre por último.
  const names = await page
    .getByRole("navigation", { name: "Seções dos resultados" })
    .getByRole("button")
    .allTextContents();
  expect(names.at(-1)).toBe("Exportar");
});

test("Dunnett e Kruskal–Wallis/Dunn: comparações com o controle e por postos", async ({ page }) => {
  test.setTimeout(120_000);
  await startCompare(page, ["Condição"]);
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2, 10.0, 10.4].map((v) => ["controle", v]),
    ...[12.5, 12.8, 12.2, 12.6, 12.4].map((v) => ["T1", v]),
    ...[10.2, 10.5, 9.8, 10.1].map((v) => ["T2", v]),
  ];
  await paste(
    page,
    "Condição — Obs. 1",
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByTestId("procedure-select").selectOption("dunnett");
  await page.getByLabel("Nível de controle").selectOption("controle");
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  await expect(page.getByTestId("procedure-summary")).toContainText("controle");
  await page.getByTestId("section-tables").click();
  // Dois tratamentos contra o controle; T1 difere e T2 não.
  const pairs = page.getByTestId("procedure-pairs").locator("tbody tr");
  await expect(pairs).toHaveCount(2);
  await expect(pairs.filter({ hasText: "T1" })).toContainText("diferença detectada");
  await expect(pairs.filter({ hasText: "T2" })).toContainText("diferença não detectada");
});

test("ANOVA multifatorial com dois fatores: tabela, médias marginais e contraste", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startCompare(page, ["Dose", "Tipo"]);
  const lines: string[] = [];
  const effect: Record<string, number> = { t1: 0, t2: 2, t3: 5 };
  for (const [di, dose] of ["d1", "d2"].entries())
    for (const tipo of ["t1", "t2", "t3"])
      for (let r = 0; r < 3; r++) {
        const y =
          10 + di * 3 + (effect[tipo] ?? 0) + (r - 1) * 0.4 + (di === 1 && tipo === "t3" ? 1.5 : 0);
        lines.push(`${dose}\t${tipo}\t${String(y).replace(".", ",")}`);
      }
  await paste(page, "Dose — Obs. 1", lines.join("\n"));
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("radio", { name: /Vários fatores/ }).check();
  await page.getByRole("checkbox", { name: "Tipo", exact: true }).check();
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();

  await expect(page.getByTestId("factorial-summary")).toBeVisible();
  await page.getByTestId("section-tables").click();
  const anova = page.getByTestId("factorial-anova");
  await expect(anova).toContainText("Dose × Tipo");
  await expect(anova).toContainText("Resíduo");
  await expect(anova.locator("tbody tr")).toHaveCount(5); // Dose, Tipo, Dose × Tipo, Resíduo, Total
  await expect(page.getByTestId("marginal-f1")).toBeVisible();
});

test("DBC aleatorizado: gerar blocos, preencher respostas e analisar com bloco", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Tratamento");
  await page.getByLabel("Níveis (opcional)").nth(0).fill("A; B; C");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Dia");
  await page.getByLabel("Níveis (opcional)").nth(1).fill("d1; d2; d3; d4");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();

  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /em blocos/ })
    .check();
  await expect(page.getByTestId("rcbd-count")).toContainText(
    "12 ensaios: 3 tratamentos × 4 blocos.",
  );
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await expect(page.getByTestId("rcbd-generated")).toContainText("12 ensaios");
  await expect(page.getByTestId("rcbd-table").locator("tbody tr")).toHaveCount(12);
  await expect(page.getByTestId("rcbd-matrix")).toContainText("pcg32-xsh-rr/fisher-yates");

  // Doze respostas distintas, na ordem de execução gerada.
  const values = Array.from({ length: 12 }, (_, i) =>
    String(10 + i * 0.7 + (i % 3) * 1.3).replace(".", ","),
  );
  await paste(page, "Atividade — Obs. 1", values.join("\n"));
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: /Analisar planejamento|Comparar tratamentos/ }).click();
  await page.getByTestId("section-tables").click();
  const anova = page.getByTestId("factorial-anova");
  await expect(anova).toContainText("Dia (bloco)");
  await expect(anova.locator("tbody tr")).toHaveCount(4); // Tratamento, Dia, Resíduo, Total
});

test("níveis mistos: 3 cepas × 2 pH × 2 repetições, ANOVA multifatorial e planilha de coleta", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Cepa");
  await page.getByLabel("Níveis (opcional)").nth(0).fill("A; B; C");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("pH");
  await page.getByLabel("Níveis (opcional)").nth(1).fill("5; 7");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();

  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Níveis mistos/ })
    .check();
  await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
  await expect(page.getByTestId("mixed-count")).toContainText(
    "12 ensaios: 6 combinações × 2 repetições.",
  );
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await expect(page.getByTestId("mixed-generated")).toContainText("12 ensaios");
  const table = page.getByTestId("mixed-table");
  await expect(table.locator("tbody tr")).toHaveCount(12);
  // Ordem padrão (sem aleatorizar): a cepa varia mais depressa que o pH.
  await expect(table.locator("tbody tr").nth(0)).toContainText("C1.1-R1");
  await expect(table.locator("tbody tr").nth(1)).toContainText("C2.1-R1");
  await expect(table.locator("tbody tr").nth(3)).toContainText("C1.2-R1");

  const values = Array.from({ length: 12 }, (_, i) =>
    String(10 + (i % 3) * 2 + Math.floor((i % 6) / 3) * 1.5 + (i % 5) * 0.2).replace(".", ","),
  );
  await paste(page, "Atividade — Obs. 1", values.join(String.fromCharCode(10)));
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: /Analisar planejamento|Comparar tratamentos/ }).click();
  await page.getByTestId("section-tables").click();
  const anova = page.getByTestId("factorial-anova");
  await expect(anova).toContainText("Cepa × pH");
  await expect(anova).toContainText("Resíduo");
  await expect(anova.locator("tbody tr")).toHaveCount(5); // Cepa, pH, Cepa × pH, Resíduo, Total
});

test("misturas: simplex-lattice {3,2}, resposta, modelo quadrático de Scheffé e gráfico ternário", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, name] of ["Água", "Etanol", "Glicerol"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(3).fill("Rendimento");
  await page.getByRole("button", { name: "Avançar" }).click();

  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Misturas/ })
    .check();
  await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
  await page.getByLabel("Pontos centrais extras").fill("1");
  await expect(page.getByTestId("mixture-count")).toContainText(
    "13 ensaios: 6 pontos × 2 repetições + 1 centrais extras.",
  );
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await expect(page.getByTestId("mixture-generated")).toContainText("13 ensaios");
  const table = page.getByTestId("mixture-table");
  await expect(table.locator("tbody tr")).toHaveCount(13);
  // Ordem padrão: lexicográfica crescente; o primeiro ensaio é o vértice do 3.º componente.
  await expect(table.locator("tbody tr").nth(0)).toContainText("0");
  await expect(table.locator("tbody tr").nth(0).locator("td").nth(4)).toHaveText("1");

  // Resposta verdadeira: 10·x1 + 20·x2 + 30·x3 + 25·x1·x2 (+ ruído pequeno e fixo).
  const base = [
    [0, 0, 2],
    [0, 1, 1],
    [0, 2, 0],
    [1, 0, 1],
    [1, 1, 0],
    [2, 0, 0],
  ];
  const points = [...base, ...base].map((a) => a.map((v) => v / 2));
  points.push([1 / 3, 1 / 3, 1 / 3]);
  const noise = [0.02, -0.03, 0.01, 0.04, -0.02, 0.03, -0.01, 0.02, -0.04, 0.01, 0.03, -0.02, 0.0];
  const values = points.map(([x1 = 0, x2 = 0, x3 = 0], i) =>
    String(10 * x1 + 20 * x2 + 30 * x3 + 25 * x1 * x2 + (noise[i] ?? 0)).replace(".", ","),
  );
  await paste(page, "Rendimento — Obs. 1", values.join(String.fromCharCode(10)));
  await page.getByRole("button", { name: "Avançar" }).click();

  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo" }).click();
  const coefficients = page.getByTestId("scheffe-coefficients");
  await expect(coefficients.locator("tbody tr")).toHaveCount(6);
  await expect(coefficients).toContainText("Água·Etanol");
  const cell = await coefficients.locator("tbody tr").nth(3).locator("td").first().textContent();
  expect(Number((cell ?? "").replace(",", "."))).toBeGreaterThan(24);
  expect(Number((cell ?? "").replace(",", "."))).toBeLessThan(26);
  await expect(page.getByTestId("scheffe-anova")).toContainText("Resíduo");
  await expect(page.getByTestId("scheffe-fit-stats")).toContainText("R²");
  await expect(page.getByTestId("ternary-plot")).toBeVisible();
  await page.getByTestId("ternary-plot").screenshot({ path: testInfo.outputPath("ternario.png") });
});

test("planejamento ótimo: D-ótimo quadrático com restrição, e uso nos dados", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, name] of ["Temperatura", "pH"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();

  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  await page.getByLabel("Limite baixo de Temperatura").fill("20");
  await page.getByLabel("Limite alto de Temperatura").fill("40");
  await page.getByLabel("Limite baixo de pH").fill("5");
  await page.getByLabel("Limite alto de pH").fill("7");
  await page.getByRole("combobox", { name: "Modelo" }).selectOption("quadratic");
  await page.getByLabel("Total de ensaios").fill("9");
  // Restrição: Temperatura + 5·pH ≤ 70 (corta o canto de temperatura e pH altos).
  await page.getByRole("button", { name: "Adicionar restrição" }).click();
  await page.getByLabel("Restrição 1: coeficiente de Temperatura").fill("1");
  await page.getByLabel("Restrição 1: coeficiente de pH").fill("5");
  await page.getByLabel("Restrição 1: limite").fill("70");
  await page.getByRole("button", { name: "Buscar planejamento" }).click();

  await expect(page.getByTestId("optimal-summary")).toContainText("9 ensaios escolhidos entre");
  const table = page.getByTestId("optimal-table");
  await expect(table.locator("tbody tr")).toHaveCount(9);
  for (const row of await table.locator("tbody tr").all()) {
    const cells = await row.locator("td").allTextContents();
    const temperature = Number((cells[1] ?? "").replace(",", "."));
    const ph = Number((cells[2] ?? "").replace(",", "."));
    expect(temperature + 5 * ph).toBeLessThanOrEqual(70 + 1e-9);
  }
  await expect(page.getByTestId("optimal-metrics")).toContainText("ln|X′X|");
  await expect(page.getByTestId("optimal-result")).toContainText("não garante o ótimo global");

  await page.getByRole("button", { name: "Usar este planejamento nos dados" }).click();
  await expect(page.getByTestId("optimal-applied")).toContainText("9 ensaios novos");
  await expect(page.getByLabel("Temperatura — Obs. 9")).not.toHaveValue("");
  await expect(page.getByLabel("pH — Obs. 1")).not.toHaveValue("");
});

test("figura: letras manuais, anotação livre e aparência completa vão para o SVG exportado", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startCompare(page, ["Condição"]);
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2].map((v) => ["A", v]),
    ...[12.0, 12.4, 11.8, 12.1].map((v) => ["B", v]),
    ...[15.0, 15.3, 14.8, 15.1].map((v) => ["C", v]),
  ];
  await paste(
    page,
    "Condição — Obs. 1",
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByTestId("procedure-select").selectOption("gamesHowell");
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  await page.getByTestId("section-charts").click();

  const chart = page.getByTestId("procedure-chart");
  await chart.getByText("Personalizar figura").click();
  await chart.getByTestId("manual-letters").fill("a b -");
  await chart.getByRole("button", { name: "Adicionar anotação" }).click();
  await chart.getByLabel("Texto da anotação 1").fill("p < 0,05");
  await chart.getByLabel("Cor principal").fill("#aa3377");
  await chart.getByLabel("Fundo da imagem exportada").selectOption("transparent");
  await chart.getByLabel("Fonte", { exact: true }).selectOption("serif");
  await chart.getByLabel("Mostrar linhas de grade").uncheck();

  const letters = chart.locator('svg text[data-figure="letters"]');
  await expect(letters).toHaveText(["a", "b", ""]);
  await expect(chart.locator('svg text[data-figure="annotation"]')).toHaveText("p < 0,05");
  await expect(chart).toContainText("Letras digitadas manualmente");
  await expect(chart.locator('svg line[data-figure="grid"]')).toHaveCount(0);

  const download = page.waitForEvent("download");
  await chart.getByRole("button", { name: /Figura — SVG/ }).click();
  const svg = readFileSync((await (await download).path()) as string, "utf8");
  expect(svg).toContain("#aa3377");
  expect(svg).toContain("Georgia");
  expect(svg).toContain("p &lt; 0,05");
  expect(svg).not.toContain('data-figure="background"');
  expect(svg).not.toContain('data-figure="grid"');
  expect(svg).toContain("Letras digitadas manualmente");
});
