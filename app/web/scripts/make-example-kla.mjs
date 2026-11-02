// Gera `examples/06-kla-sintetico/projeto.enzitag` pelo próprio aplicativo (navegador real e motor
// WASM): composto central de face centrada com dois fatores (RPM e aeração) e DUAS respostas, kLa e
// potência específica, para mostrar um modelo por resposta. Os dados são SINTÉTICOS (superfícies
// quadráticas conhecidas + ruído de uma sequência pseudoaleatória com semente fixa); não são as
// medições reais do grupo.
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-kla.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../examples/06-kla-sintetico");
mkdirSync(out, { recursive: true });

const FACTORS = [
  ["RPM", "rpm", 300, 500],
  ["Aeração", "vvm", 0.5, 1.5],
];
const RESPONSES = [
  ["kLa", "1/h"],
  ["Potência", "W/m³"],
];
// Superfícies verdadeiras na escala codificada.
const KLA = { b0: 40, linear: [18, 6], quad: [-9, 0.2], cross: 0.4, noise: 1.2 };
const POWER = { b0: 150, linear: [80, 6], quad: [25, 0.5], cross: 0, noise: 4 };
const SEED = 20261101;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(31);
const normal = () => Math.sqrt(-2 * Math.log(random() + 1e-12)) * Math.cos(2 * Math.PI * random());
const surface = (s, [x1, x2]) =>
  s.b0 +
  s.linear[0] * x1 +
  s.linear[1] * x2 +
  s.quad[0] * x1 * x1 +
  s.quad[1] * x2 * x2 +
  s.cross * x1 * x2 +
  s.noise * normal();

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
await page.goto("http://127.0.0.1:4173/");
await page.getByLabel("Nome do projeto").fill("kLa — exemplo sintético");
await page.getByRole("radio", { name: /Planejar experimento/ }).check();
await page.getByRole("button", { name: "Avançar" }).click();
for (const [i, [name, unit]] of FACTORS.entries()) {
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
  await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  await page.getByLabel("Unidade (opcional)").nth(i).fill(unit);
}
for (const [j, [name, unit]] of RESPONSES.entries()) {
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
await page.getByRole("radio", { name: /Face centrada|face centrada/ }).check();
await page.getByLabel("Pontos centrais").fill("5");
await page.getByLabel("Semente da aleatorização").fill(String(SEED));
await page.getByTestId("run-count").filter({ hasText: "Total: 13 ensaios" }).waitFor();
await page.getByRole("button", { name: "Gerar planejamento" }).click();
await page.getByTestId("design-generated").waitFor();

const total = 13;
const rows = [];
const columns = RESPONSES.map(() => []);
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
  rows.push(real);
  columns[0].push(surface(KLA, coded).toFixed(1));
  columns[1].push(surface(POWER, coded).toFixed(0));
}
for (const [j, [name]] of RESPONSES.entries()) {
  await page.getByRole("textbox", { name: `${name} — Obs. 1`, exact: true }).evaluate(
    (el, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    },
    columns[j].map((v) => v.replace(".", ",")).join("\n"),
  );
}
await page.getByRole("button", { name: "Avançar" }).click();
await page.getByRole("button", { name: "Calcular superfície" }).click();
await page.getByTestId("section-model").click();
await page.getByTestId("model-panel").waitFor();

// kLa: aplica a recomendação (a aeração ao quadrado e a interação saem); depois confere a potência
// com o modelo completo e volta ao kLa, que guarda o modelo reduzido.
await page.getByTestId("apply-recommendation").click();
await page.waitForFunction(() =>
  document.querySelector('[data-testid="apply-recommendation"]')?.hasAttribute("disabled"),
);
await page.getByTestId("model-response").selectOption({ label: "Potência" });
await page.getByTestId("model-panel").waitFor();
await page.waitForTimeout(800);
await page.getByTestId("model-response").selectOption({ label: "kLa" });
await page.waitForTimeout(800);

const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
writeFileSync(
  resolve(out, "ensaios.csv"),
  `ordem_de_execucao,${FACTORS.map(([n, u]) => `${n} (${u})`).join(",")},${RESPONSES.map(([n, u]) => `${n} (${u})`).join(",")}\n${rows
    .map((r, i) => `${i + 1},${r.join(",")},${columns.map((c) => c[i]).join(",")}`)
    .join("\n")}\n`,
);
await browser.close();
console.log("Gerado:", resolve(out, "projeto.enzitag"));
