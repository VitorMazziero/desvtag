import { readFileSync, writeFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// Planilha de coleta (ET13), com o motor Rust real (WebAssembly): gerar o planejamento → baixar a
// matriz (já com a coluna da resposta) → preencher o arquivo fora do aplicativo → importar o MESMO
// arquivo → as respostas caem nos ensaios certos, sem mexer no planejamento → reexportar com os valores.

test.use({ locale: "pt-BR", acceptDownloads: true });

/** Tabela do CSV exportado: depois das linhas `#` e da linha em branco. */
function tableOf(csv: string): { head: string[]; lines: string[][]; header: string } {
  const all = csv.replace(/^﻿/, "").split("\r\n");
  const start = all.indexOf("") + 1;
  const table = all.slice(start).filter((l) => l !== "");
  const header = table[0] ?? "";
  return { head: header.split(","), lines: table.slice(1).map((l) => l.split(",")), header };
}

async function downloadCsv(page: Page, button: string): Promise<string> {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: button }).click();
  return readFileSync((await (await download).path()) as string, "utf8");
}

async function importFile(page: Page, path: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…" }).click();
  await (await chooser).setFiles(path);
  await expect(page.getByTestId("import-wizard")).toBeVisible();
}

test.describe("planilha de coleta", () => {
  test("planejamento de dois níveis: exportar, preencher fora, importar o mesmo arquivo", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    for (const [i, [name, unit]] of [
      ["Temperatura", "°C"],
      ["pH", ""],
    ].entries() as IterableIterator<[number, [string, string]]>) {
      await page.getByRole("button", { name: "Adicionar fator" }).click();
      await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
      await page.getByLabel("Tipo").nth(i).selectOption("numeric");
      await page.getByLabel("Unidade (opcional)").nth(i).fill(unit);
    }
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
    await page.getByLabel("Unidade (opcional)").nth(2).fill("U/mL");
    await page.getByRole("button", { name: "Avançar" }).click();

    await page.getByLabel("Temperatura — Nível baixo").fill("20");
    await page.getByLabel("Temperatura — Nível alto").fill("30");
    await page.getByLabel("pH — Nível baixo").fill("5");
    await page.getByLabel("pH — Nível alto").fill("7");
    await page.getByLabel("Pontos centrais").fill("2");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("design-generated")).toContainText("6 ensaios");

    // A matriz já traz a coluna da resposta, com a unidade, vazia.
    const sheet = tableOf(await downloadCsv(page, "Baixar matriz (CSV)"));
    expect(sheet.head.at(-1)).toBe("Atividade (U/mL)");
    expect(sheet.lines).toHaveLength(6);
    expect(sheet.lines.every((l) => l.at(-1) === "")).toBe(true);

    // Preenchimento fora do aplicativo: um valor por ensaio, na ordem do arquivo.
    const value = (i: number) => (10 + i * 1.5).toFixed(1);
    const filled = [
      sheet.header,
      ...sheet.lines.map((l, i) => [...l.slice(0, -1), value(i)].join(",")),
    ].join("\r\n");
    const path = testInfo.outputPath("planilha.csv");
    writeFileSync(path, `﻿# app: EnziTAG Optima\r\n\r\n${filled}\r\n`);

    await importFile(page, path);
    await expect(page.getByTestId("fill-responses")).toBeVisible();
    await expect(page.getByTestId("fill-summary")).toContainText("6 valor(es)");
    await page.getByRole("button", { name: "Preencher respostas" }).click();
    await expect(page.getByTestId("import-wizard")).toHaveCount(0);

    // Cada ensaio recebeu o valor da sua linha (os níveis conferem, inclusive as réplicas centrais).
    for (const [i, line] of sheet.lines.entries()) {
      const run = Number(line[0]);
      await expect(page.getByLabel(`Atividade — Obs. ${run}`)).toHaveValue(value(i));
    }
    // O planejamento continua ligado: a matriz segue na tela e os níveis não mudaram.
    await expect(page.getByTestId("matrix-table").locator("tbody tr")).toHaveCount(6);

    // Reexportar traz os valores já digitados.
    const again = tableOf(await downloadCsv(page, "Baixar matriz (CSV)"));
    expect(again.lines.map((l) => l.at(-1))).toEqual(sheet.lines.map((_, i) => value(i)));
  });

  test("DIC: o arquivo cruza pela unidade experimental e substitui só as respostas", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
    await page.getByLabel("Níveis (opcional)").fill("Controle; pH 5; pH 7");
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByLabel("Unidades experimentais por nível").fill("2");
    await page.getByLabel("Semente da aleatorização").fill("7");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("crd-generated")).toContainText("6 ensaios");

    const sheet = tableOf(await downloadCsv(page, "Matriz do DIC (CSV)"));
    expect(sheet.head).toEqual([
      "run",
      "standard_order",
      "unit_id",
      "Condição",
      "replicate",
      "Atividade",
    ]);
    const unitIndex = sheet.head.indexOf("unit_id");
    // Linhas embaralhadas no arquivo: a unidade experimental é quem manda.
    const reversed = [...sheet.lines].reverse();
    const filled = [
      sheet.header,
      ...reversed.map((l) => [...l.slice(0, -1), `${Number(l[0]) + 20}`].join(",")),
    ].join("\r\n");
    const path = testInfo.outputPath("planilha-dic.csv");
    writeFileSync(path, `﻿${filled}\r\n`);

    await importFile(page, path);
    await expect(page.getByTestId("fill-summary")).toContainText("6 valor(es)");
    await page.getByRole("button", { name: "Preencher respostas" }).click();
    await expect(page.getByTestId("import-wizard")).toHaveCount(0);
    for (const l of sheet.lines) {
      const run = Number(l[0]);
      await expect(page.getByLabel(`Atividade — Obs. ${run}`)).toHaveValue(String(run + 20));
      await expect(page.getByLabel(`Condição — Obs. ${run}`)).toHaveValue(l[3] as string);
    }
    expect(unitIndex).toBe(2);
  });

  test("avisa quando o arquivo não corresponde aos ensaios e não grava nada", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.getByRole("radio", { name: /Planejar experimento/ }).check();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Condição");
    await page.getByLabel("Níveis (opcional)").fill("A; B");
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByLabel("Unidades experimentais por nível").fill("2");
    await page.getByRole("button", { name: "Gerar planejamento" }).click();
    await expect(page.getByTestId("crd-generated")).toContainText("4 ensaios");

    const path = testInfo.outputPath("errada.csv");
    writeFileSync(path, "unit_id,Condição,Atividade\nT9-R9,Z,10\nT1-R1,A,abc\n");
    await importFile(page, path);
    await expect(page.getByTestId("fill-unmatched")).toContainText("Linhas: 1");
    await expect(page.getByTestId("fill-invalid")).toBeVisible();
    await expect(page.getByRole("button", { name: "Preencher respostas" })).toBeDisabled();
  });
});
