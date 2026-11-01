// Gera `examples/01-enzimas-quatro-condicoes/projeto.enzitag` pelo próprio aplicativo (navegador
// real + motor WASM), percorrendo o fluxo de comparação de tratamentos com os dados do exemplo.
// Uso (com `npm run build` feito): node scripts/make-example.mjs
// Requer o servidor de preview em http://127.0.0.1:4173 (`npm run preview`).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = resolve(root, "examples/01-enzimas-quatro-condicoes");
mkdirSync(out, { recursive: true });
const rows = readFileSync(resolve(out, "dados.csv"), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [level, value] = line.split(",");
    return `${level}\t${value.replace(".", ",")}`;
  })
  .join("\n");

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
await page.goto("http://127.0.0.1:4173/");
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
await page.getByLabel("Condição — Obs. 1").evaluate((el, value) => {
  const data = new DataTransfer();
  data.setData("text/plain", value);
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: data });
  el.dispatchEvent(event);
}, rows);
await page.getByRole("button", { name: "Avançar" }).click();
await page.getByRole("combobox", { name: /Fator que define/ }).selectOption({ label: "Condição" });
await page.getByRole("button", { name: "Comparar tratamentos" }).click();
await page.getByTestId("anova-table").waitFor();
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
copyFileSync(await (await download).path(), resolve(out, "projeto.enzitag"));
await browser.close();
console.log("Gerado:", resolve(out, "projeto.enzitag"));
