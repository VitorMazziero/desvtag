import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Superfície de resposta com o motor Rust real (WebAssembly): planejar (CCD e Box–Behnken) →
// preencher → ajustar → equação, falta de ajuste, malha, extrapolação e exportação; e matriz
// personalizada no caminho "Analisar dados existentes".

async function paste(page: Page, label: string, text: string) {
  await page.getByRole("textbox", { name: label, exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function addNumericFactor(page: Page, index: number, name: string) {
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(index).fill(name);
  await page.getByLabel("Tipo").nth(index).selectOption("numeric");
}

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("planejamento de superfície de resposta", () => {
  test("DCCR e Box–Behnken: contagem antes de gerar, α, axiais e restrições", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const [i, name] of ["A", "B", "C"].entries()) await addNumericFactor(page, i, name);
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(3).fill("y");
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const name of ["A", "B", "C"]) {
      await page.getByLabel(`${name} — Nível baixo`).fill("10");
      await page.getByLabel(`${name} — Nível alto`).fill("30");
    }
    await page.getByRole("radio", { name: /Superfície de resposta \(segunda ordem\)/ }).check();
    // Pontos centrais sugeridos (5) e contagem do DCCR de 3 fatores: 8 + 6 + 5 = 19.
    await expect(page.getByLabel("Pontos centrais")).toHaveValue("5");
    await expect(page.getByTestId("run-count")).toContainText("Total: 19 ensaios");
    // Face centrada: o mesmo número de ensaios, α = 1.
    await page.getByRole("radio", { name: /Face centrada|face centrada/ }).check();
    await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("design-generated")).toContainText("19 ensaios");
    const matrix = page.getByTestId("matrix-table");
    await expect(matrix.locator("tbody tr")).toHaveCount(19);
    await expect(matrix.locator("tbody tr").nth(8)).toContainText("axial");
    await expect(matrix.locator("tbody tr").nth(13)).toContainText("axial");
    await expect(matrix.locator("tbody tr").nth(14)).toContainText("central");
    await expect(page.getByTestId("axial-distance")).toContainText("α = 1");
    await expect(page.getByTestId("axial-distance")).toContainText("8 pontos fatoriais, 6 axiais");

    // α informado e inscrito: axiais exatamente nos níveis (10 e 30).
    await page.getByRole("radio", { name: /α informado/ }).check();
    await page.getByLabel("Distância axial α (0 a 10)").fill("2");
    await page.getByLabel(/^Inscrito/).check();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Gerar novamente" }).click();
    await expect(page.getByTestId("axial-distance")).toContainText("α = 2");

    // Box–Behnken: 12 + 5 centrais.
    await page.getByRole("radio", { name: /Box–Behnken/ }).check();
    await expect(page.getByTestId("run-count")).toContainText("Total: 17 ensaios");
    // α inválido recusado pelo motor com mensagem localizada.
    await page.getByRole("radio", { name: /α informado/ }).check();
    await page.getByLabel("Distância axial α (0 a 10)").fill("0");
    await expect(page.getByRole("alert").filter({ hasText: "distância axial" })).toBeVisible();
  });

  test("Box–Behnken exige de 3 a 5 fatores", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const [i, name] of ["A", "B"].entries()) await addNumericFactor(page, i, name);
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(2).fill("y");
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const name of ["A", "B"]) {
      await page.getByLabel(`${name} — Nível baixo`).fill("0");
      await page.getByLabel(`${name} — Nível alto`).fill("1");
    }
    await page.getByRole("radio", { name: /Superfície de resposta \(segunda ordem\)/ }).check();
    await expect(page.getByRole("radio", { name: /Box–Behnken/ })).toBeDisabled();
    await expect(page.getByTestId("run-count")).toContainText("Total: 13 ensaios");
  });
});

test.describe("análise da superfície", () => {
  test("fluxo completo: gerar DCCR, preencher, ajustar, ver equação e malha, exportar e reabrir", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const [i, name] of ["Temperatura", "pH"].entries()) await addNumericFactor(page, i, name);
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(2).fill("Rendimento");
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByLabel("Temperatura — Nível baixo").fill("30");
    await page.getByLabel("Temperatura — Nível alto").fill("40");
    await page.getByLabel("pH — Nível baixo").fill("5");
    await page.getByLabel("pH — Nível alto").fill("7");
    await page.getByRole("radio", { name: /Superfície de resposta \(segunda ordem\)/ }).check();
    await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
    await expect(page.getByTestId("run-count")).toContainText("Total: 13 ensaios");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("matrix-table").locator("tbody tr")).toHaveCount(13);

    // Respostas de uma superfície exata (sem ruído) na escala codificada:
    // y = 50 + 4x1 + 2x2 − 3x1² − 2x2² + x1x2. O ajuste deve recuperá-la.
    const coded: Array<[number, number]> = [];
    const a = Math.SQRT2;
    for (const x2 of [-1, 1]) for (const x1 of [-1, 1]) coded.push([x1, x2]);
    coded.push([-a, 0], [a, 0], [0, -a], [0, a]);
    for (let i = 0; i < 5; i++) coded.push([0, 0]);
    const noise = (i: number) => [0.31, -0.22, 0.14, -0.35, 0.28][i % 5] as number;
    const y = coded.map(([x1, x2], i) => {
      const base = 50 + 4 * x1 + 2 * x2 - 3 * x1 * x1 - 2 * x2 * x2 + x1 * x2;
      return Number((base + (i >= 8 ? noise(i) : 0)).toFixed(3));
    });
    await paste(page, "Rendimento — Obs. 1", y.map((v) => String(v).replace(".", ",")).join("\n"));
    await page.getByRole("button", { name: "Avançar" }).click();
    await expect(
      page.getByRole("heading", { name: "Análise: superfície de resposta" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Calcular superfície" }).click();

    const terms = page.getByTestId("surface-terms");
    await expect(terms).toBeVisible();
    // 1 intercepto + 5 termos; os coeficientes recuperam a superfície (ruído só nos centrais).
    await expect(terms.locator("tbody tr")).toHaveCount(6);
    await expect(terms.locator("tbody tr").nth(1)).toContainText("Temperatura");
    await expect(terms.locator("tbody tr").nth(1)).toContainText("4,");
    await expect(page.getByTestId("lack-of-fit")).toContainText("Erro puro");
    await expect(page.getByTestId("equation-coded")).toContainText("ŷ = ");
    await expect(page.getByTestId("equation-real")).toContainText("Temperatura²");
    await expect(page.getByTestId("region-table").locator("tbody tr")).toHaveCount(2);
    await expect(page.getByTestId("surface-chart")).toBeVisible();
    await expect(page.getByTestId("contour-chart")).toBeVisible();

    // Eixos e valores fixados: trocar os eixos recalcula a malha; mesmos eixos é recusado.
    await page.getByLabel(/^Eixo horizontal/).selectOption({ label: "pH" });
    await page.getByLabel(/^Eixo vertical/).selectOption({ label: "Temperatura" });
    await expect(page.getByTestId("contour-chart")).toContainText("Temperatura");
    await page.getByLabel(/^Eixo vertical/).selectOption({ label: "pH" });
    await expect(page.getByRole("alert").filter({ hasText: "fatores diferentes" })).toBeVisible();
    await page.getByLabel(/^Eixo vertical/).selectOption({ label: "Temperatura" });

    // Exportações: coeficientes e malha (CSV com proveniência) e figura SVG.
    const coefficients = page.waitForEvent("download");
    await page.getByRole("button", { name: "Coeficientes (CSV)" }).click();
    const csv = readFileSync((await (await coefficients).path()) as string, "utf8");
    expect(csv).toContain("# methodId: response_surface");
    expect(csv).toContain("Temperatura:pH");
    const gridDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Malha de predições (CSV)" }).click();
    const gridCsv = readFileSync((await (await gridDownload).path()) as string, "utf8");
    expect(gridCsv).toContain("extrapolation");
    const svgDownload = page.waitForEvent("download");
    await page
      .getByTestId("contour-chart")
      .getByRole("button", { name: /Figura — SVG/ })
      .click();
    const svg = readFileSync((await (await svgDownload).path()) as string, "utf8");
    expect(svg).toContain("<metadata>");
    expect(svg).toContain("response_surface");

    // Salvar e reabrir: o resultado volta sem recálculo e atual.
    const save = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = (await (await save).path()) as string;
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file);
    await expect(page.getByTestId("surface-terms")).toBeVisible();
    await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
  });

  test("matriz personalizada: ajuste de superfície no caminho de dados existentes, sem eliminação automática de termos", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const [i, name] of ["X1", "X2"].entries()) await addNumericFactor(page, i, name);
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(2).fill("y");
    await page.getByRole("button", { name: "Avançar" }).click();
    // Pontos irregulares (3² fatorial com um ponto repetido) e superfície exata.
    const points: Array<[number, number]> = [];
    for (const a of [0, 5, 10]) for (const b of [0, 10, 20]) points.push([a, b]);
    points.push([5, 10]);
    const f = ([a, b]: [number, number]) => 20 + 0.8 * a + 0.3 * b - 0.06 * a * a - 0.004 * b * b;
    const rows = points.map((p) => `${p[0]}\t${p[1]}\t${f(p).toFixed(4)}`).join("\n");
    await page.getByRole("button", { name: "Adicionar linha" }).click();
    await paste(page, "X1 — Obs. 1", rows.replace(/\./g, ","));
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByLabel("Ajustar superfície de resposta (modelo de segunda ordem)").check();
    await expect(
      page.getByRole("heading", { name: "Análise: superfície de resposta" }),
    ).toBeVisible();
    // Modelo escolhido à mão: sem o produto X1:X2; nenhum termo some sozinho.
    await page.getByLabel("Escolher os termos").check();
    await page.getByLabel("X1 × X2").uncheck();
    await page.getByRole("button", { name: "Calcular superfície" }).click();
    const terms = page.getByTestId("surface-terms");
    await expect(terms.locator("tbody tr")).toHaveCount(5); // intercepto + X1, X2, X1², X2²
    await expect(terms).not.toContainText("X1:X2");
    // Superfície exata: R² = 1 e a falta de ajuste é testável (ponto repetido).
    await expect(page.getByTestId("fit-measures")).toContainText("1");
  });
});
