import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { openAbout } from "./menus";
import { showAllSections } from "./showAll";

// Percurso de comparação de tratamentos com o motor Rust real (WebAssembly em Worker):
// importar/colar → ANOVA → Tukey → letras → exportar → salvar → reabrir.

const here = dirname(fileURLToPath(import.meta.url));
const caseDir = resolve(
  here,
  "../../../../validation/cases/one_way_comparison/101-enzimas-quatro-condicoes",
);
const expected = JSON.parse(readFileSync(resolve(caseDir, "expected.json"), "utf8"));

async function paste(page: Page, label: string, text: string) {
  await page.getByLabel(label).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

/** Linhas "nível\tvalor" (vírgula decimal) a partir do CSV do caso de validação. */
function pastedRows(): string {
  return readFileSync(resolve(caseDir, "input.csv"), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [level, value] = line.split(",");
      return `${level}\t${String(value).replace(".", ",")}`;
    })
    .join("\n");
}

const pt = (n: number, digits: number) =>
  new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: digits, useGrouping: false }).format(
    n,
  );

test.use({ locale: "pt-BR", acceptDownloads: true });

// Estes percursos conferem todo o resultado de uma vez; a navegação por seções tem teste próprio.
test.beforeEach(async ({ page }) => showAllSections(page));

test.describe("comparação de tratamentos (quatro condições enzimáticas)", () => {
  test("ANOVA, Tukey, letras, gráficos, exportação e reabertura", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByLabel("Nome do projeto").fill("Enzimas — quatro condições");
    await page.getByRole("radio", { name: /Comparar tratamentos/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();

    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
    await page.getByLabel("Níveis (opcional)").fill("controle; pH 5; pH 7; pH 9");
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByLabel("Unidade (opcional)").nth(1).fill("U/mL");
    await page.getByRole("button", { name: "Avançar" }).click();

    await page.getByRole("button", { name: "Adicionar linha" }).click();
    await paste(page, "Condição — Obs. 1", pastedRows());
    await expect(page.getByLabel("Atividade — Obs. 20")).toHaveValue("12,9");
    await page.getByRole("button", { name: "Avançar" }).click();

    // Configuração: fator e α; o botão só habilita com o fator escolhido.
    await expect(
      page.getByRole("heading", { name: "Análise: comparação de tratamentos" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Comparar tratamentos" })).toBeDisabled();
    await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
    await page.getByRole("button", { name: "Comparar tratamentos" }).click();

    // ANOVA contra o SciPy (5 algarismos significativos exibidos).
    const anova = page.getByTestId("anova-table");
    await expect(anova).toBeVisible();
    await expect(anova.getByRole("row", { name: /Entre grupos/ })).toContainText(
      pt(expected.anova.f, 5),
    );
    await expect(anova.getByRole("row", { name: /Entre grupos/ })).toContainText("3");
    await expect(anova.getByRole("row", { name: /Dentro dos grupos/ })).toContainText("16");

    // Letras idênticas às da referência (cliques maximais), uma por grupo.
    const letters = expected.letters as string[];
    for (const [i, value] of letters.entries()) {
      await expect(page.getByTestId(`letters-${i}`)).toHaveText(value);
    }
    // Pares: 6 comparações; a tabela mostra o p ajustado (Tukey) e o resultado por par.
    const pairs = page.getByTestId("pair-table");
    await expect(pairs.locator("tbody tr")).toHaveCount(6);
    await expect(pairs).toContainText("diferença detectada");

    // Interpretação: conclusão, evidência e próximo passo; legenda das letras; independência.
    const interpretation = page.getByTestId("interpretation");
    await expect(interpretation).toContainText("4 grupos");
    await expect(interpretation).toContainText("não significa que sejam equivalentes");
    await expect(interpretation).toContainText("não verifica independência");
    await expect(page.getByTestId("brown-forsythe")).toContainText("Brown–Forsythe");

    // Gráfico de médias: barra de incerteza SEMPRE nomeada; trocar a incerteza troca o nome.
    const means = page.getByTestId("means-chart");
    await expect(means.locator("svg")).toHaveAttribute("role", "img");
    await expect(means).toContainText("Barras: média ± IC 95%");
    await expect(means).toContainText("Letras em comum = diferença não detectada");
    await page.getByRole("combobox", { name: /Barras de incerteza/ }).selectOption("sd");
    await expect(means).toContainText("Barras: média ± desvio-padrão do grupo");
    await page.getByRole("combobox", { name: /Barras de incerteza/ }).selectOption("ci");
    await expect(page.getByTestId("box-chart")).toBeVisible();
    await expect(page.getByTestId("residuals-chart")).toBeVisible();
    await expect(page.getByTestId("qq-chart")).toBeVisible();

    // Exportação: CSV com metadados; SVG com <metadata>; PNG com assinatura e chunk tEXt.
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Pares (CSV)" }).click();
    const csv = readFileSync((await (await csvDownload).path()) as string, "utf8");
    expect(csv.startsWith("﻿# app: EnziTAG Optima")).toBe(true);
    expect(csv).toContain("# methodId: one_way_comparison");
    expect(csv).toContain("# revisionId: v");
    expect(csv).toContain("group_a,group_b,difference,std_error,q,p_adjusted");
    expect(
      csv.split("\r\n").filter((l) => l.startsWith("controle,") || l.startsWith("pH ")).length,
    ).toBe(6);

    const svgDownload = page.waitForEvent("download");
    await means.getByRole("button", { name: /Figura — SVG/ }).click();
    const svg = readFileSync((await (await svgDownload).path()) as string, "utf8");
    expect(svg).toContain("<metadata>");
    expect(svg).toContain("one_way_comparison");
    expect(svg).toContain("Barras: média ± IC 95%");
    expect(svg).not.toContain("var(");

    const pngDownload = page.waitForEvent("download");
    await means.getByRole("button", { name: /Figura — PNG/ }).click();
    const png = readFileSync((await (await pngDownload).path()) as string);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.includes(Buffer.from("tEXt"))).toBe(true);
    expect(png.includes(Buffer.from("one_way_comparison"))).toBe(true);

    // Salvar → editar → abrir: o resultado guardado reaparece SEM recalcular e está atual.
    const saveDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = await (await saveDownload).path();
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await page.getByRole("textbox", { name: "Atividade — Obs. 1", exact: true }).fill("99");
    await expect(page.getByRole("button", { name: /^Resultados/ })).toBeDisabled();
    page.once("dialog", (d) => d.accept());
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file as string);
    await expect(page.getByTestId("anova-table")).toBeVisible();
    for (const [i, value] of letters.entries()) {
      await expect(page.getByTestId(`letters-${i}`)).toHaveText(value);
    }
    await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
    await openAbout(page);
    await page.getByTestId("history").locator("summary").click();
    await expect(page.getByTestId("analysis-record")).toHaveCount(1);
  });
});

test("abre o exemplo 01 do repositório com o resultado guardado e atual", async ({ page }) => {
  const example = resolve(here, "../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag");
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example);
  await expect(page.getByLabel("Nome do projeto")).toHaveValue("Enzimas — quatro condições");
  await expect(page.getByTestId("anova-table")).toBeVisible();
  for (const [i, value] of (expected.letters as string[]).entries()) {
    await expect(page.getByTestId(`letters-${i}`)).toHaveText(value);
  }
  await expect(page.getByText("Os dados ou as opções mudaram")).toHaveCount(0);
  await expect(
    page.getByTestId("anova-table").getByRole("row", { name: /Entre grupos/ }),
  ).toContainText(pt(expected.anova.f, 5));
});

test.describe("treatment comparison in English", () => {
  test.use({ locale: "en-US" });

  test("labels, decimal separator and the pairs table follow the language", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Compare treatments/ }).check();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Add factor" }).click();
    await page.getByLabel("Name", { exact: true }).first().fill("Condition");
    await page.getByRole("button", { name: "Add response" }).click();
    await page.getByLabel("Name", { exact: true }).nth(1).fill("Activity");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Add row" }).click();
    await paste(
      page,
      "Condition — Obs. 1",
      "A\t1.0\nA\t1.2\nA\t0.9\nB\t2.0\nB\t2.2\nB\t1.9\nC\t3.0\nC\t3.1\nC\t2.8\n",
    );
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Factor that defines the groups").selectOption({ label: "Condition" });
    await page.getByLabel("Significance level (α)").selectOption("0.01");
    await page.getByRole("button", { name: "Compare treatments" }).click();
    await expect(page.getByRole("heading", { name: "Treatment comparison" })).toBeVisible();
    await expect(page.getByTestId("anova-table")).toContainText("Between groups");
    await expect(page.getByTestId("pair-table")).toContainText("Tukey");
    await expect(page.getByTestId("pair-table")).toContainText("α = 0.01");
    await expect(page.getByTestId("means-chart")).toContainText("Bars: mean ± 99% CI");
  });
});
