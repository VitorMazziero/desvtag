// Gera `examples/04-otimizacao-e-confirmacao/projeto.enzitag` pelo próprio aplicativo (navegador
// real e motor WASM): DCCR de três fatores com DUAS respostas (atividade enzimática e subproduto),
// superfície de resposta, otimização por desejabilidade com limite obrigatório e proposta de
// ensaios de confirmação, com os valores "observados" da confirmação (sintéticos) já preenchidos.
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-optimization.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../examples/04-otimizacao-e-confirmacao");
mkdirSync(out, { recursive: true });

const FACTORS = [
  ["Glicose", "g/L", 20, 40],
  ["Peptona", "g/L", 3, 7],
  ["NaCl", "g/L", 1, 2],
];
const SEED = 20261101;
// Superfícies verdadeiras (escala codificada).
const truth = ([x1, x2, x3]) => ({
  activity:
    120 +
    5 * x1 +
    3 * x2 -
    1 * x3 -
    6 * x1 * x1 -
    4 * x2 * x2 -
    3 * x3 * x3 +
    1.2 * x1 * x2 -
    0.8 * x2 * x3,
  byproduct: 18 + 4 * x1 - 3 * x2 + 2 * x3 + 2 * x1 * x1 + 1 * x2 * x2 + 1.5 * x3 * x3,
});

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(21);
const normal = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
const coded = (real) =>
  real.map(
    (v, i) => (v - (FACTORS[i][2] + FACTORS[i][3]) / 2) / ((FACTORS[i][3] - FACTORS[i][2]) / 2),
  );

async function paste(page, label, text) {
  await page.getByRole("textbox", { name: label, exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}
async function readRow(page, obs) {
  const real = [];
  for (const [name] of FACTORS)
    real.push(
      Number(
        (
          await page
            .getByRole("textbox", { name: `${name} — Obs. ${obs}`, exact: true })
            .inputValue()
        ).replace(",", "."),
      ),
    );
  return real;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  locale: "pt-BR",
  acceptDownloads: true,
  viewport: { width: 1200, height: 1000 },
});
await page.goto("http://127.0.0.1:4173/");
await page.getByLabel("Nome do projeto").fill("Otimização do meio de cultivo");
await page.getByRole("radio", { name: /Planejar experimento/ }).check();
await page.getByRole("button", { name: "Avançar" }).click();
for (const [i, [name, unit]] of FACTORS.entries()) {
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
  await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  await page.getByLabel("Unidade (opcional)").nth(i).fill(unit);
}
for (const [j, [name, unit]] of [
  ["Atividade enzimática", "U/mL"],
  ["Subproduto", "mg/L"],
].entries()) {
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page
    .getByLabel("Nome", { exact: true })
    .nth(FACTORS.length + j)
    .fill(name);
  await page
    .getByLabel("Unidade (opcional)")
    .nth(FACTORS.length + j)
    .fill(unit);
}
await page.getByRole("button", { name: "Avançar" }).click();
for (const [name, , low, high] of FACTORS) {
  await page.getByLabel(`${name} — Nível baixo`).fill(String(low));
  await page.getByLabel(`${name} — Nível alto`).fill(String(high));
}
await page.getByRole("radio", { name: /Superfície de resposta \(segunda ordem\)/ }).check();
await page.getByLabel("Pontos centrais").fill("5");
await page.getByLabel("Semente da aleatorização").fill(String(SEED));
await page.getByTestId("run-count").filter({ hasText: "Total: 19 ensaios" }).waitFor();
await page.getByRole("button", { name: "Gerar planejamento" }).click();
await page.getByTestId("design-generated").waitFor();

const lines = [];
const table = [];
for (let obs = 1; obs <= 19; obs++) {
  const real = await readRow(page, obs);
  const t = truth(coded(real));
  const a = (t.activity + 1.0 * normal()).toFixed(1);
  const b = (t.byproduct + 0.6 * normal()).toFixed(1);
  lines.push(`${a.replace(".", ",")}\t${b.replace(".", ",")}`);
  table.push([obs, ...real, a, b]);
}
await paste(page, "Atividade enzimática — Obs. 1", lines.join("\n"));
await page.getByRole("button", { name: "Avançar" }).click();
await page.getByRole("button", { name: "Calcular superfície" }).click();
await page.getByTestId("surface-terms").waitFor();

// Otimização: atividade (maximizar, importância 2, mínimo obrigatório 105) e subproduto (minimizar).
await page.getByLabel("Atividade enzimática — Menor valor aceitável").fill("100");
await page.getByLabel("Atividade enzimática — Alvo").fill("122");
await page.getByLabel("Atividade enzimática — Importância").fill("2");
await page.getByLabel("Atividade enzimática — Limite obrigatório: previsto no mínimo").fill("105");
await page.getByLabel("Subproduto — incluir na otimização").check();
await page.getByLabel("Subproduto — Objetivo").selectOption("minimize");
await page.getByLabel("Subproduto — Alvo").fill("14");
await page.getByLabel("Subproduto — Maior valor aceitável").fill("30");
await page.getByRole("button", { name: "Buscar condições ótimas" }).click();
await page.getByTestId("candidate-table").first().waitFor();
await page.getByTestId("desirability-chart").waitFor();
const candidates = await page.getByTestId("candidate-table").first().textContent();

// Confirmação: candidato 1, duas repetições.
await page.getByLabel("Repetições por candidato").fill("2");
await page.getByRole("button", { name: "Propor ensaios de confirmação" }).click();
await page.getByTestId("confirmation-check").waitFor();
// Valores "observados" sintéticos nas condições propostas (arredondadas a 5 algarismos).
const conf = [];
const confRows = [];
for (let obs = 1; obs <= 2; obs++) {
  const real = await readRow(page, obs);
  const t = truth(coded(real));
  const a = (t.activity + 1.0 * normal()).toFixed(1);
  const b = (t.byproduct + 0.6 * normal()).toFixed(1);
  conf.push(`${a.replace(".", ",")}\t${b.replace(".", ",")}`);
  confRows.push([obs, ...real, a, b]);
}
await paste(page, "Atividade enzimática — Obs. 1", conf.join("\n"));
await page.getByTestId("confirmation-check").waitFor();
const check = await page.getByTestId("confirmation-check").textContent();

const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
const csv = (head, rows) => `${head}\n${rows.map((r) => r.join(",")).join("\n")}\n`;
writeFileSync(
  resolve(out, "ensaios.csv"),
  csv(
    "ordem_de_execucao,Glicose (g/L),Peptona (g/L),NaCl (g/L),atividade_U_mL,subproduto_mg_L",
    table,
  ),
);
writeFileSync(
  resolve(out, "confirmacao.csv"),
  csv("ensaio,Glicose (g/L),Peptona (g/L),NaCl (g/L),atividade_U_mL,subproduto_mg_L", confRows),
);
console.log(candidates);
console.log(check);
await browser.close();
console.log("Gerado:", resolve(out, "projeto.enzitag"));
