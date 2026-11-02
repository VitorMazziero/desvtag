import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { showAllSections } from "./showAll";

// Exemplos 07 (misturas) e 08 (Monod): o projeto distribuído abre e os resultados conferem com a
// regressão independente registrada no README de cada exemplo.

test.use({ locale: "pt-BR" });

const example = (name: string) =>
  fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url));

async function open(page: Page, name: string) {
  await showAllSections(page);
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example(name));
}

const number = (text: string | null) => Number((text ?? "").replace(/\s/g, "").replace(",", "."));

test("exemplo 07: Scheffé quadrático recupera os coeficientes do README", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "07-misturas-scheffe");
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo" }).click();
  const rows = page.getByTestId("scheffe-coefficients").locator("tbody tr");
  await expect(rows).toHaveCount(6);
  const estimates = await rows.evaluateAll((trs) =>
    trs.map((tr) => tr.querySelector("td")?.textContent ?? ""),
  );
  const expected = [10.0055, 19.9855, 30.0055, 25.0302, 0.0702, -0.0098];
  for (const [i, value] of expected.entries())
    expect(Math.abs(number((estimates[i] ?? "").replace("−", "-")) - value)).toBeLessThan(5e-4);
  await expect(page.getByTestId("ternary-plot")).toBeVisible();
});

test("exemplo 08: Monod recupera Vmax e Km do README", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "08-saturacao-monod");
  const panel = page.getByTestId("saturation-fit");
  await panel.getByText(/Curvas de saturação/).click();
  await panel.getByRole("button", { name: "Ajustar curva" }).click();
  const rows = page.getByTestId("saturation-parameters").locator("tbody tr");
  await expect(rows).toHaveCount(2);
  const first = (i: number) => rows.nth(i).locator("td").first().textContent();
  expect(Math.abs(number(await first(0)) - 3.0022)).toBeLessThan(5e-4);
  expect(Math.abs(number(await first(1)) - 2.4983)).toBeLessThan(5e-4);
});

test("exemplo 09: ANOVA de níveis mistos confere com o statsmodels", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "09-niveis-mistos");
  await page.getByRole("button", { name: /Analisar planejamento|Comparar tratamentos/ }).click();
  await page.getByTestId("section-tables").click();
  const anova = page.getByTestId("factorial-anova");
  await expect(anova).toContainText("Cepa × pH");
  await expect(anova).toContainText("217,3");
  await expect(anova).toContainText("109,7");
  await expect(anova).toContainText("3,571");
});

test("exemplo 10: superfície do D-ótimo confere com a regressão independente", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "10-planejamento-otimo");
  await page.getByRole("button", { name: "Calcular superfície" }).click();
  await page.getByTestId("section-model").click();
  const rows = page.getByTestId("surface-terms").locator("tbody tr");
  await expect(rows).toHaveCount(6);
  const estimates = (
    await rows.evaluateAll((trs) => trs.map((tr) => tr.querySelector("td")?.textContent ?? ""))
  )
    .map((text) => number(text.replace("−", "-")))
    .sort((a, b) => a - b);
  const expected = [-3.0125, -1.9775, 1.3712, 3.0438, 4.0088, 19.985];
  for (const [i, value] of expected.entries())
    expect(Math.abs((estimates[i] ?? Number.NaN) - value)).toBeLessThan(5e-4);
});

test("exemplo 11: pareado, Wilcoxon e modelo misto conferem com SciPy e statsmodels", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await open(page, "11-medidas-repetidas");
  const panel = page.getByTestId("repeated-measures");
  await panel.getByText("Medidas repetidas, pareados e modelos mistos").click();
  await panel.getByRole("button", { name: "Comparar pares" }).click();
  const paired = page.getByTestId("paired-result");
  await expect(paired).toContainText("6 pares");
  await expect(paired).toContainText("-1,15");
  await expect(paired).toContainText("-10,29");
  await expect(paired).toContainText("0,0001493");
  await expect(paired).toContainText("W = 0 ");
  await expect(page.getByTestId("wilcoxon-p")).toContainText("0,03125");
  await panel.getByRole("button", { name: "Ajustar modelo misto" }).click();
  await expect(page.getByTestId("variance-components")).toContainText("0,961");
  await expect(page.getByTestId("variance-components")).toContainText("0,92467");
});

test("exemplo 12: tamanho de amostra de duas amostras (SciPy: 37 por grupo, potência 0,8076)", async ({
  page,
}) => {
  test.setTimeout(90_000); // o Firefox da CI é lento ao carregar o motor sob carga
  await page.goto("/");
  const panel = page.getByTestId("power-calculator");
  // A tela inicial pode remontar depois do primeiro clique (Firefox sob carga): repete até abrir.
  await expect(async () => {
    if ((await panel.getAttribute("open")) === null)
      await panel.getByText("Calculadora de potência e tamanho de amostra").click();
    await expect(page.getByLabel("Diferença esperada")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 25_000 });
  await page.getByLabel("Diferença esperada").fill("1");
  await page.getByLabel("Desvio-padrão esperado (σ)").fill("1,5");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.getByTestId("power-summary")).toContainText("37 por grupo (total 74)");
  await expect(page.getByTestId("power-summary")).toContainText("0,8076");
});

test("exemplo 13: o projeto tem as respostas da planilha nos ensaios certos", async ({ page }) => {
  await open(page, "13-planilha-de-coleta");
  await page.getByRole("button", { name: /Planejamento e dados/ }).click();
  for (const [i, value] of ["10.0", "11.5", "13.0", "14.5", "16.0", "17.5"].entries())
    await expect(
      page.getByRole("textbox", { name: new RegExp(`^Atividade.* — Obs. ${i + 1}$`) }),
    ).toHaveValue(value);
});
