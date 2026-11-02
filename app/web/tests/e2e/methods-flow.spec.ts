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
