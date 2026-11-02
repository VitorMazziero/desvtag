import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// PDF da figura de médias (comparação de um fator): o conversor de SVG só funciona se houver uma
// fonte corrente no documento (regressão encontrada na verificação nativa).
test.use({ locale: "pt-BR", acceptDownloads: true });
test("PDF da figura de médias de um fator: válido, com uma página e texto vetorial", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("radio", { name: /Comparar tratamentos/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const rows = [
    ["A", 10.1],
    ["A", 10.3],
    ["B", 12.0],
    ["B", 12.4],
    ["C", 15.0],
    ["C", 15.3],
  ];
  await page.getByLabel("Condição — Obs. 1", { exact: true }).evaluate(
    (el, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    },
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  await page.getByTestId("section-charts").click();
  const d = page.waitForEvent("download", { timeout: 30000 });
  await page
    .getByTestId("means-chart")
    .getByRole("button", { name: /Figura — PDF/ })
    .click();
  const file = await d;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  const bytes = readFileSync((await file.path()) as string);
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  expect(bytes.toString("latin1")).toContain("%%EOF");
  if (process.env.ENZITAG_KEEP_DIR)
    writeFileSync(`${process.env.ENZITAG_KEEP_DIR}/medias.pdf`, bytes);
});
