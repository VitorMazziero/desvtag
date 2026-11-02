// Gera os exemplos 09 (níveis mistos), 10 (planejamento D-ótimo), 11 (medidas repetidas) e 13
// (planilha de coleta) pelo próprio aplicativo (navegador real e motor WASM). Dados SINTÉTICOS:
// funções conhecidas mais perturbações fixas e pequenas, listadas neste arquivo.
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-v03b.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, "../../../examples");
const NL = String.fromCharCode(10);
const comma = (v) => String(v).replace(".", ",");
const BASE = "http://127.0.0.1:4173/";

async function paste(page, label, text) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function open(browser) {
  const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto(BASE);
  return page;
}

async function download(page, click) {
  const wait = page.waitForEvent("download");
  await click();
  return wait;
}

async function saveProject(page, folder) {
  const out = resolve(examples, folder);
  mkdirSync(out, { recursive: true });
  const file = await download(page, () =>
    page.getByRole("button", { name: "Salvar", exact: true }).click(),
  );
  copyFileSync(await file.path(), resolve(out, "projeto.enzitag"));
  return out;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const browser = await chromium.launch();

// ---- 09: níveis mistos ----
{
  const page = await open(browser);
  await page.getByLabel("Nome do projeto").fill("Níveis mistos — exemplo sintético");
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
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await page.getByTestId("mixed-generated").waitFor();
  // Ordem do planejamento: a cepa varia mais depressa que o pH; duas repetições.
  const values = Array.from(
    { length: 12 },
    (_, i) =>
      Math.round((10 + (i % 3) * 2 + Math.floor((i % 6) / 3) * 1.5 + (i % 5) * 0.2) * 10) / 10,
  );
  await paste(page, "Atividade — Obs. 1", values.map(comma).join(NL));
  const out = await saveProject(page, "09-niveis-mistos");
  const strains = ["A", "B", "C"];
  writeFileSync(
    resolve(out, "ensaios.csv"),
    `ordem,Cepa,pH,repeticao,Atividade${NL}${values
      .map(
        (v, i) =>
          `${i + 1},${strains[i % 3]},${[5, 7][Math.floor(i / 3) % 2]},${Math.floor(i / 6) + 1},${v}`,
      )
      .join(NL)}${NL}`,
  );
  await page.close();
}

// ---- 10: planejamento D-ótimo ----
{
  const page = await open(browser);
  await page.getByLabel("Nome do projeto").fill("Planejamento D-ótimo — exemplo sintético");
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
  await page.getByRole("button", { name: "Adicionar restrição" }).click();
  await page.getByLabel("Restrição 1: coeficiente de Temperatura").fill("1");
  await page.getByLabel("Restrição 1: coeficiente de pH").fill("5");
  await page.getByLabel("Restrição 1: limite").fill("70");
  await page.getByRole("button", { name: "Buscar planejamento" }).click();
  await page.getByTestId("optimal-table").waitFor();
  await page.getByRole("button", { name: "Usar este planejamento nos dados" }).click();
  await page.getByTestId("optimal-applied").waitFor();
  // Lê os 9 ensaios da grade e aplica a superfície verdadeira (escala codificada) com ruído fixo.
  const random = mulberry32(2026);
  const rows = [];
  const y = [];
  for (let n = 1; n <= 9; n++) {
    const t = Number(
      (await page.getByLabel(`Temperatura — Obs. ${n}`, { exact: true }).inputValue()).replace(
        ",",
        ".",
      ),
    );
    const ph = Number(
      (await page.getByLabel(`pH — Obs. ${n}`, { exact: true }).inputValue()).replace(",", "."),
    );
    const a = (t - 30) / 10;
    const b = (ph - 6) / 1;
    const value = 20 + 4 * a + 3 * b - 3 * a * a - 2 * b * b + 1.5 * a * b + (random() - 0.5) * 0.6;
    rows.push([t, ph]);
    y.push(Math.round(value * 100) / 100);
  }
  await paste(page, "Atividade — Obs. 1", y.map(comma).join(NL));
  const out = await saveProject(page, "10-planejamento-otimo");
  writeFileSync(
    resolve(out, "ensaios.csv"),
    `ordem,Temperatura,pH,Atividade${NL}${rows.map((r, i) => `${i + 1},${r[0]},${r[1]},${y[i]}`).join(NL)}${NL}`,
  );
  await page.close();
}

// ---- 11: medidas repetidas ----
{
  const page = await open(browser);
  await page.getByLabel("Nome do projeto").fill("Medidas repetidas — exemplo sintético");
  await page.getByRole("radio", { name: /Comparar tratamentos/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  await page.getByText("Opções avançadas").click();
  await page.getByLabel("Mostrar a coluna de unidade experimental").check();
  const before = [10.1, 11.2, 9.8, 12.5, 10.9, 11.7];
  const delta = [1.2, 0.8, 1.5, 1.1, 0.9, 1.4];
  const after = before.map((b, i) => Math.round((b + delta[i]) * 10) / 10);
  const lines = before.flatMap((b, i) => [
    `S${i + 1}\tAntes\t${comma(b)}`,
    `S${i + 1}\tDepois\t${comma(after[i])}`,
  ]);
  await paste(page, "Unidade experimental — Obs. 1", lines.join(NL));
  const out = await saveProject(page, "11-medidas-repetidas");
  writeFileSync(
    resolve(out, "ensaios.csv"),
    `unidade,Condição,Atividade${NL}${before
      .flatMap((b, i) => [`S${i + 1},Antes,${b}`, `S${i + 1},Depois,${after[i]}`])
      .join(NL)}${NL}`,
  );
  await page.close();
}

// ---- 13: planilha de coleta ----
{
  const page = await open(browser);
  await page.getByLabel("Nome do projeto").fill("Planilha de coleta — exemplo sintético");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, [name, unit]] of [
    ["Temperatura", "°C"],
    ["pH", ""],
  ].entries()) {
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
  await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await page.getByTestId("design-generated").waitFor();

  const out = resolve(examples, "13-planilha-de-coleta");
  mkdirSync(out, { recursive: true });
  const csvFile = await download(page, () =>
    page.getByRole("button", { name: "Baixar matriz (CSV)" }).click(),
  );
  const empty = readFileSync(await csvFile.path(), "utf8");
  writeFileSync(resolve(out, "planilha-vazia.csv"), empty);
  // Preenchimento fora do aplicativo: um valor por ensaio, na ordem do arquivo.
  const all = empty.replace(/^﻿/, "").split("\r\n");
  const table = all.slice(all.indexOf("") + 1).filter((l) => l !== "");
  const filled = [
    table[0],
    ...table.slice(1).map((l, i) => {
      const cells = l.split(",");
      cells[cells.length - 1] = (10 + i * 1.5).toFixed(1);
      return cells.join(",");
    }),
  ].join("\r\n");
  writeFileSync(
    resolve(out, "planilha-preenchida.csv"),
    `﻿# app: EnziTAG Optima\r\n\r\n${filled}\r\n`,
  );
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…" }).click();
  await (await chooser).setFiles(resolve(out, "planilha-preenchida.csv"));
  await page.getByTestId("fill-responses").waitFor();
  await page.getByRole("button", { name: "Preencher respostas" }).click();
  await page.getByTestId("import-wizard").waitFor({ state: "detached" });
  await saveProject(page, "13-planilha-de-coleta");
  await page.close();
}

await browser.close();
console.log("Gerados: 09, 10, 11 e 13");
