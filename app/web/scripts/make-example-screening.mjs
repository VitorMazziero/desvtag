// Gera `examples/02-triagem-meio-cultivo/projeto.enzitag` pelo próprio aplicativo (navegador real
// e motor WASM): triagem Plackett–Burman de 12 ensaios com seis componentes de meio de cultivo e
// quatro pontos centrais; as respostas são SINTÉTICAS (efeitos verdadeiros conhecidos + ruído de
// uma sequência pseudoaleatória com semente fixa) e entram na grade na ordem de execução.
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-screening.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../examples/02-triagem-meio-cultivo");
mkdirSync(out, { recursive: true });

const FACTORS = [
  ["Glicose", "g/L", 10, 30, 4.0],
  ["Extrato de levedura", "g/L", 2, 6, 0.5],
  ["Peptona", "g/L", 2, 6, 2.5],
  ["NaCl", "g/L", 1, 5, -1.5],
  ["MgSO4", "g/L", 0.1, 0.5, 0.0],
  ["KH2PO4", "g/L", 0.5, 1.5, 0.3],
]; // [nome, unidade, baixo, alto, efeito verdadeiro por unidade codificada]
const CURVATURE = 6.0;
const SEED = 20261101;

// Gerador pseudoaleatório do exemplo (mulberry32) e Box–Muller: determinístico.
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(7);
const normal = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
await page.goto("http://127.0.0.1:4173/");
await page.getByLabel("Nome do projeto").fill("Triagem de meio de cultivo");
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
await page.getByLabel("Orçamento máximo de ensaios (opcional)").fill("12");
await page.getByLabel("Pontos centrais").fill("4");
await page.getByLabel("Semente da aleatorização").fill(String(SEED));
// Espera o motor recomendar Plackett–Burman de 12 ensaios (12 + 4 centrais = 16).
await page
  .getByText(/Plackett–Burman — 12 ensaios.*recomendado/)
  .waitFor({ timeout: 8000 })
  .catch(async () => {
    console.log(await page.getByTestId("design-panel").textContent());
    throw new Error("sem recomendação PB 12");
  });
await page.getByTestId("run-count").filter({ hasText: "Total: 16 ensaios" }).waitFor();
await page.getByRole("button", { name: "Gerar planejamento" }).click();
await page.getByTestId("design-generated").waitFor();

// Lê a matriz gerada (valores reais, na ordem de execução) e calcula as respostas sintéticas.
const total = 16;
const responses = [];
for (let obs = 1; obs <= total; obs++) {
  let y = 100 + 0;
  let allCenter = true;
  for (const [name, , low, high, effect] of FACTORS) {
    const real = Number(
      (
        await page.getByRole("textbox", { name: `${name} — Obs. ${obs}`, exact: true }).inputValue()
      ).replace(",", "."),
    );
    const coded = (real - (low + high) / 2) / ((high - low) / 2);
    if (Math.abs(coded) > 1e-9) allCenter = false;
    y += (effect / 2) * coded; // coeficiente = efeito/2
  }
  y += (allCenter ? CURVATURE : 0) + 1.5 * normal();
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
await page.getByRole("button", { name: "Analisar planejamento" }).click();
await page.getByTestId("effects-table").waitFor();

const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
writeFileSync(
  resolve(out, "respostas.csv"),
  `ordem_de_execucao,atividade_U_mL\n${responses.map((v, i) => `${i + 1},${v}`).join("\n")}\n`,
);
await browser.close();
console.log("Gerado:", resolve(out, "projeto.enzitag"));
