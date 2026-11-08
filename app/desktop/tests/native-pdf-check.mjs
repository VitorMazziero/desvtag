// Verificação nativa do PDF (v0.2): no aplicativo Tauri real, sob a CSP de produção, gera o PDF de
// uma figura e o do relatório pela interface e confere que os arquivos entregues ao comando
// `export_file` são PDFs válidos. O diálogo nativo de «Salvar como» não é automatizável: o
// executável de verificação é construído com `--features automation`, que faz o comando gravar na
// pasta de `ENZITAG_EXPORT_DIR` (o instalador não tem essa característica).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

async function paste(page, label, text) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

async function waitForFiles(dir, count, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".pdf")) : [];
    if (files.length >= count) return files.sort();
    await sleep(250);
  }
  throw new Error(`Esperava ${count} PDF(s) em ${dir}; encontrados: ${readdirSync(dir).join(", ")}`);
}

/**
 * @param {import("playwright-core").Page} page
 * @param {string} exportDir pasta de `ENZITAG_EXPORT_DIR` do executável
 */
export async function runPdfCheck(page, exportDir) {
  const messages = [];
  page.on("console", (m) => messages.push(`${m.type()}: ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => messages.push(`pageerror: ${String(e).slice(0, 300)}`));
  try {
    await runPdfSteps(page, exportDir);
  } catch (error) {
    console.error(`Mensagens do WebView durante o PDF:\n${messages.slice(-10).join("\n")}`);
    throw error;
  }
}

async function runPdfSteps(page, exportDir) {
  await page.evaluate(()=>{localStorage.setItem("optima.showAllSections","1");localStorage.removeItem("optima.updateChannel");});
  await page.reload();
  await page.getByTestId("engine-version").waitFor({state:"attached"});
  // Interface em português, para usar os mesmos rótulos dos testes E2E.
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.getByTestId("objective-compare").check();
  await page.getByTestId("objective-start").click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2].map((v) => ["A", v]),
    ...[12.0, 12.4, 11.8, 12.1].map((v) => ["B", v]),
    ...[15.0, 15.3, 14.8, 15.1].map((v) => ["C", v]),
  ];
  await paste(
    page,
    "Condição — Obs. 1",
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  await page.getByTestId("section-charts").click();

  await page.getByTestId("means-chart").getByTestId("figure-menu").locator(":scope > summary").click();
  await page.getByTestId("means-chart").getByRole("button", { name: /Figura — PDF/ }).click();
  const figure = await waitForFiles(exportDir, 1, 60000);
  await page.getByTestId("section-export").click();
  await page.getByTestId("report-pdf-button").click();
  const both = await waitForFiles(exportDir, 2, 90000);
  const report = both.find((f) => f.includes("relatorio"));
  const figureName = figure[0];
  if (!report || !figureName) throw new Error(`PDFs inesperados: ${both.join(", ")}`);

  for (const [name, kind, minimum] of [
    [figureName, "figura", 5_000],
    [report, "relatório", 20_000],
  ]) {
    const bytes = readFileSync(resolve(exportDir, name));
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error(`PDF da ${kind}: cabeçalho inválido`);
    if (!bytes.toString("latin1").includes("%%EOF")) throw new Error(`PDF da ${kind}: sem fim de arquivo`);
    if (bytes.length < minimum) throw new Error(`PDF da ${kind}: pequeno demais (${bytes.length} bytes)`);
    console.log(`OK: PDF ${kind === "figura" ? "da figura" : "do relatório"} gerado no aplicativo nativo (${name}, ${bytes.length} bytes).`);
  }
}
