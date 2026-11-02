// Verificação nativa do PDF (v0.2): no aplicativo Tauri real, sob a CSP de produção, gera o PDF de
// uma figura e o do relatório pela interface e confere que os bytes entregues ao comando
// `export_file` são PDFs válidos. O diálogo nativo de «Salvar como» não é automatizável: o comando
// é interceptado na ponte IPC da página (só ele; os demais seguem para o Rust).

async function paste(page, label, text) {
  await page.getByLabel(label, { exact: true }).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

/** @param {import("playwright-core").Page} page */
export async function runPdfCheck(page) {
  await page.evaluate(() => {
    const internals = window.__TAURI_INTERNALS__;
    const real = internals.invoke.bind(internals);
    window.__exports = [];
    internals.invoke = (command, args, options) => {
      if (command === "export_file") {
        window.__exports.push({ name: args.suggestedName, base64: args.bytesBase64 });
        return Promise.resolve({ name: args.suggestedName });
      }
      return real(command, args, options);
    };
  });

  // Interface em português, para usar os mesmos rótulos dos testes E2E.
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  await page.getByRole("radio", { name: /Comparar tratamentos/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
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

  await page.getByTestId("means-chart").getByRole("button", { name: /Figura — PDF/ }).click();
  await page.waitForFunction(() => window.__exports.length >= 1, null, { timeout: 30000 });
  await page.getByTestId("section-export").click();
  await page.getByTestId("report-pdf-button").click();
  await page.waitForFunction(() => window.__exports.length >= 2, null, { timeout: 60000 });

  const exported = await page.evaluate(() => window.__exports);
  for (const [i, kind, minimum] of [
    [0, "figura", 5_000],
    [1, "relatório", 20_000],
  ]) {
    const file = exported[i];
    const bytes = Buffer.from(file.base64, "base64");
    if (!file.name.endsWith(".pdf")) throw new Error(`PDF do ${kind}: nome inesperado ${file.name}`);
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error(`PDF do ${kind}: cabeçalho inválido`);
    if (!bytes.toString("latin1").includes("%%EOF")) throw new Error(`PDF do ${kind}: sem fim de arquivo`);
    if (bytes.length < minimum) throw new Error(`PDF do ${kind}: pequeno demais (${bytes.length} bytes)`);
    console.log(`OK: PDF da ${kind === "figura" ? "figura" : "do relatório"} gerado no aplicativo nativo (${file.name}, ${bytes.length} bytes).`);
  }
}
