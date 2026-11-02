// Gera os exemplos 07 (misturas e modelo de Scheffé) e 08 (curva de saturação de Monod) pelo próprio
// aplicativo (navegador real e motor WASM). Dados SINTÉTICOS: funções conhecidas mais perturbações
// fixas e pequenas (listadas neste arquivo).
// Uso (com `npm run build` feito e `npm run preview` em http://127.0.0.1:4173):
//   node scripts/make-example-v03.mjs
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const examples = resolve(here, "../../../examples");
const NL = String.fromCharCode(10);
const comma = (v) => String(v).replace(".", ",");

async function paste(page, label, text) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function save(page, folder) {
  const out = resolve(examples, folder);
  mkdirSync(out, { recursive: true });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
  return out;
}

const browser = await chromium.launch();

// ---- 07: misturas ----
{
  const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Nome do projeto").fill("Misturas — exemplo sintético");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, name] of ["Água", "Etanol", "Glicerol"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(3).fill("Rendimento");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Misturas/ })
    .check();
  await page.getByLabel("Aleatorizar a ordem de execução").uncheck();
  await page.getByLabel("Pontos centrais extras").fill("1");
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await page.getByTestId("mixture-generated").waitFor();

  // Resposta verdadeira: 10·x1 + 20·x2 + 30·x3 + 25·x1·x2 (+ perturbação fixa).
  const base = [
    [0, 0, 2],
    [0, 1, 1],
    [0, 2, 0],
    [1, 0, 1],
    [1, 1, 0],
    [2, 0, 0],
  ];
  const points = [...base, ...base].map((a) => a.map((v) => v / 2));
  points.push([1 / 3, 1 / 3, 1 / 3]);
  const noise = [0.02, -0.03, 0.01, 0.04, -0.02, 0.03, -0.01, 0.02, -0.04, 0.01, 0.03, -0.02, 0.0];
  const values = points.map(
    ([x1 = 0, x2 = 0, x3 = 0], i) =>
      Math.round((10 * x1 + 20 * x2 + 30 * x3 + 25 * x1 * x2 + (noise[i] ?? 0)) * 1e4) / 1e4,
  );
  await paste(page, "Rendimento — Obs. 1", values.map(comma).join(NL));
  const out = await save(page, "07-misturas-scheffe");
  writeFileSync(
    resolve(out, "ensaios.csv"),
    `ordem,Água,Etanol,Glicerol,Rendimento${NL}${points
      .map((p, i) => `${i + 1},${p.map((v) => Math.round(v * 1e6) / 1e6).join(",")},${values[i]}`)
      .join(NL)}${NL}`,
  );
  await page.close();
}

// ---- 08: saturação ----
{
  const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Nome do projeto").fill("Saturação de Monod — exemplo sintético");
  await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Substrato");
  await page.getByLabel("Tipo").nth(0).selectOption("numeric");
  await page.getByLabel("Unidade (opcional)").nth(0).fill("g/L");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Velocidade");
  await page.getByLabel("Unidade (opcional)").nth(1).fill("g/L/h");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const x = [0.3, 0.6, 1, 1.6, 2.5, 4, 6.5, 10, 16, 25];
  // y = 3·S/(2,5 + S) com perturbações fixas.
  const noise = [0.01, -0.02, 0.015, -0.01, 0.02, -0.015, 0.01, -0.005, 0.02, -0.01];
  const y = x.map((s, i) => Math.round(((3 * s) / (2.5 + s) + (noise[i] ?? 0)) * 1e4) / 1e4);
  await paste(page, "Substrato — Obs. 1", x.map((s, i) => `${comma(s)}\t${comma(y[i])}`).join(NL));
  const out = await save(page, "08-saturacao-monod");
  writeFileSync(
    resolve(out, "ensaios.csv"),
    `Substrato (g/L),Velocidade (g/L/h)${NL}${x.map((s, i) => `${s},${y[i]}`).join(NL)}${NL}`,
  );
  await page.close();
}

await browser.close();
console.log("Gerados: 07-misturas-scheffe e 08-saturacao-monod");
