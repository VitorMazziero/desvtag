// Gera `examples/03-superficie-meio-cultivo/projeto.enzitag` pelo próprio aplicativo (navegador real
// e motor WASM): DCCR com três componentes do meio de cultivo escolhidos na triagem do exemplo 02
// (glicose, peptona e NaCl). As respostas são SINTÉTICAS: superfície quadrática conhecida + ruído
// de uma sequência pseudoaleatória com semente fixa.
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-surface.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../examples/03-superficie-meio-cultivo");
mkdirSync(out, { recursive: true });

const FACTORS = [
  ["Glicose", "g/L", 20, 40],
  ["Peptona", "g/L", 3, 7],
  ["NaCl", "g/L", 1, 2],
];
// Superfície verdadeira na escala codificada: b0 + Σ bᵢxᵢ + Σ bᵢᵢxᵢ² + Σ bᵢⱼxᵢxⱼ.
const B0 = 120;
const LINEAR = [5, 3, -1];
const QUAD = [-6, -4, -3];
const CROSS = { "0,1": 1.2, "1,2": -0.8 };
const NOISE = 1.0;
const SEED = 20261101;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(11);
const normal = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
await page.goto("http://127.0.0.1:4173/");
await page.getByLabel("Nome do projeto").fill("Superfície de resposta do meio de cultivo");
await page.getByRole("radio", { name: /Planejar experimento/ }).check();
await page.getByRole("button", { name: "Avançar" }).click();
for (const [i, [name, unit]] of FACTORS.entries()) {
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
  await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  await page.getByLabel("Unidade (opcional)").nth(i).fill(unit);
}
await page.getByRole("button", { name: "Adicionar resposta" }).click();
await page.getByLabel("Nome", { exact: true }).nth(FACTORS.length).fill("Atividade enzimática");
await page.getByLabel("Unidade (opcional)").nth(FACTORS.length).fill("U/mL");
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

const total = 19;
const rows = [];
const responses = [];
for (let obs = 1; obs <= total; obs++) {
  const real = [];
  const coded = [];
  for (const [name, , low, high] of FACTORS) {
    const v = Number(
      (
        await page.getByRole("textbox", { name: `${name} — Obs. ${obs}`, exact: true }).inputValue()
      ).replace(",", "."),
    );
    real.push(v);
    coded.push((v - (low + high) / 2) / ((high - low) / 2));
  }
  let y = B0 + NOISE * normal();
  coded.forEach((x, i) => {
    y += LINEAR[i] * x + QUAD[i] * x * x;
  });
  for (const [key, c] of Object.entries(CROSS)) {
    const [i, j] = key.split(",").map(Number);
    y += c * coded[i] * coded[j];
  }
  rows.push(real);
  responses.push(y.toFixed(1));
}
await page.getByRole("textbox", { name: "Atividade enzimática — Obs. 1", exact: true }).evaluate(
  (el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  },
  responses.map((v) => v.replace(".", ",")).join("\n"),
);
await page.getByRole("button", { name: "Avançar" }).click();
await page.getByRole("button", { name: "Calcular superfície" }).click();
await page.getByTestId("surface-terms").waitFor();

const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
writeFileSync(
  resolve(out, "ensaios.csv"),
  `ordem_de_execucao,${FACTORS.map(([n, u]) => `${n} (${u})`).join(",")},atividade_U_mL\n${rows
    .map((r, i) => `${i + 1},${r.join(",")},${responses[i]}`)
    .join("\n")}\n`,
);
await browser.close();
console.log("Gerado:", resolve(out, "projeto.enzitag"));
