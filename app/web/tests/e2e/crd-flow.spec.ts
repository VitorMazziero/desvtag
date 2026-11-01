import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// DIC aleatorizado com o motor Rust real (WebAssembly): definir o fator categórico → gerar a ordem
// de execução (conferida contra a reimplementação independente em Python) → preencher respostas →
// ANOVA/Tukey → personalizar a figura → salvar → reabrir com a personalização.

const here = dirname(fileURLToPath(import.meta.url));
const reference = JSON.parse(
  readFileSync(
    resolve(here, "../../../../validation/cases/completely_randomized_design/crd.json"),
    "utf8",
  ),
).cases[0] as {
  levels: string[];
  replicates: number;
  seed: number;
  runs: Array<{ standardOrder: number; level: string; replicate: number }>;
};

const BASE: Record<string, number> = { Controle: 10, "pH 5": 16, "pH 7": 14, "Temperatura 37": 12 };

test.use({ locale: "pt-BR", acceptDownloads: true });

test.describe("DIC aleatorizado (um fator categórico)", () => {
  test("gerar, analisar, personalizar a figura, salvar e reabrir", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByLabel("Nome do projeto").fill("Enzimas — DIC");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();

    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
    await page.getByLabel("Níveis (opcional)").fill(reference.levels.join("; "));
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByRole("button", { name: "Avançar" }).click();

    // Só há fator categórico: o painel do DIC já vem selecionado.
    await expect(page.getByTestId("crd-panel")).toBeVisible();
    await page.getByLabel("Unidades experimentais por nível").fill(String(reference.replicates));
    await page.getByLabel("Semente da aleatorização").fill(String(reference.seed));
    await expect(page.getByTestId("crd-count")).toContainText("20 ensaios: 4 níveis × 5 unidades.");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("crd-generated")).toContainText("20 ensaios");

    // A ordem exibida é a da implementação independente (mesma semente, mesmo algoritmo).
    const table = page.getByTestId("crd-table");
    await expect(table.locator("tbody tr")).toHaveCount(20);
    for (const [i, run] of reference.runs.entries()) {
      const row = table.locator("tbody tr").nth(i);
      await expect(row).toContainText(run.level);
      await expect(row.locator("td").first()).toHaveText(String(run.standardOrder));
    }
    await expect(page.getByTestId("crd-matrix")).toContainText("pcg32-xsh-rr/fisher-yates");

    // CSV da matriz: ordem de execução, unidade experimental e proveniência (semente e algoritmo).
    const matrixDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Matriz do DIC (CSV)" }).click();
    const matrixCsv = readFileSync((await (await matrixDownload).path()) as string, "utf8");
    expect(matrixCsv).toContain("# method: completely_randomized_design v1");
    expect(matrixCsv).toContain(`# seed: ${reference.seed}`);
    expect(matrixCsv).toContain("# randomization: pcg32-xsh-rr/fisher-yates");
    expect(matrixCsv).toContain("run,standard_order,unit_id,Condição,replicate");
    const first = reference.runs[0];
    expect(matrixCsv.split("\r\n").some((l) => l.startsWith(`1,${first?.standardOrder},T`))).toBe(
      true,
    );

    // Respostas na ordem de execução: cada linha traz o nível sorteado.
    const seen: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      const level = await page
        .getByRole("textbox", { name: `Condição — Obs. ${i}`, exact: true })
        .inputValue();
      seen[level] = (seen[level] ?? 0) + 1;
      const value = (BASE[level] ?? 0) + (seen[level] ?? 0) * 0.3;
      await page
        .getByRole("textbox", { name: `Atividade — Obs. ${i}`, exact: true })
        .fill(String(value).replace(".", ","));
    }
    expect(Object.values(seen)).toEqual([5, 5, 5, 5]);
    await page.getByRole("button", { name: "Avançar" }).click();

    await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
    await page.getByRole("button", { name: "Comparar tratamentos" }).click();
    const anova = page.getByTestId("anova-table");
    await expect(anova).toBeVisible();
    await expect(anova.getByRole("row", { name: /Dentro dos grupos/ })).toContainText("16");

    // Personalização da figura: título, sem letras; vale para a tela e para o SVG exportado.
    const means = page.getByTestId("means-chart");
    await expect(means).toContainText("Letras em comum = diferença não detectada");
    await means.getByText("Personalizar figura").click();
    await means.getByLabel("Título", { exact: true }).fill("Atividade por condição");
    await means.getByLabel("Mostrar letras de comparação").uncheck();
    await expect(means.locator("svg title")).toHaveText("Atividade por condição");
    await expect(means).not.toContainText("Letras em comum");
    await expect(means.locator('text[data-figure="letters"]')).toHaveCount(0);
    // A tabela de resultados mantém as letras calculadas: só a exibição da figura mudou.
    await expect(page.getByTestId("letters-0")).toBeVisible();

    const svgDownload = page.waitForEvent("download");
    await means.getByRole("button", { name: /Figura — SVG/ }).click();
    const svg = readFileSync((await (await svgDownload).path()) as string, "utf8");
    expect(svg).toContain("Atividade por condição");
    expect(svg).not.toContain("Letras em comum");
    expect(svg).toContain("Barras: média ± IC 95%");

    // Salvar → abrir: o DIC, as unidades e a personalização voltam do arquivo.
    const saveDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    const file = await (await saveDownload).path();
    expect(readFileSync(file as string).length).toBeGreaterThan(0);
    await page.reload();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(file as string);
    await expect(page.getByTestId("anova-table")).toBeVisible();
    await expect(page.getByTestId("means-chart").locator("svg title")).toHaveText(
      "Atividade por condição",
    );
    await expect(page.getByTestId("means-chart")).not.toContainText("Letras em comum");

    // O planejamento gravado reaparece com a mesma ordem.
    await page.getByRole("button", { name: /Planejamento e dados/ }).click();
    await expect(page.getByTestId("crd-table").locator("tbody tr")).toHaveCount(20);
    await expect(page.getByTestId("crd-table").locator("tbody tr").first()).toContainText(
      reference.runs[0]?.level ?? "",
    );
  });
});

test.describe("CRD in English", () => {
  test.use({ locale: "en-US" });

  test("panel, units and count follow the language", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Plan an experiment/ }).check();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Add factor" }).click();
    await page.getByLabel("Name", { exact: true }).first().fill("Condition");
    await page.getByLabel("Levels (optional)").fill("A; B; C");
    await page.getByRole("button", { name: "Add response" }).click();
    await page.getByLabel("Name", { exact: true }).nth(1).fill("Activity");
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Experimental units per level").fill("3");
    await expect(page.getByTestId("crd-count")).toContainText("9 runs: 3 levels × 3 units.");
    await page.getByRole("button", { name: "Generate design" }).click();
    await expect(page.getByTestId("crd-table").locator("tbody tr")).toHaveCount(9);
  });
});
