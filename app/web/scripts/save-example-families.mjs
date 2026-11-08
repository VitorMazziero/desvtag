// Update existing synthetic examples through the real app and WASM, preserving their data.
// Run after building, with preview on 127.0.0.1:4173. Scientific work stays in Rust.
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const examples = resolve(import.meta.dirname, "../../../examples");
const browser = await chromium.launch();
async function tool(page, kind) {
  const extras = page.getByTestId("extras-menu");
  if ((await extras.getAttribute("open")) === null)
    await extras.locator(":scope > summary").click();
  await page.getByTestId(`open-${kind}`).click();
  return page.getByTestId(`${kind}-dialog`);
}
try {
  for (const folder of [
    "07-misturas-scheffe",
    "08-saturacao-monod",
    "11-medidas-repetidas",
    "12-potencia-e-tamanho-de-amostra",
  ]) {
    const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
    await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
    await page.goto("http://127.0.0.1:4173/");
    if (!folder.startsWith("12")) {
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Abrir…", exact: true }).click();
      await (await chooser).setFiles(resolve(examples, folder, "projeto.enzitag"));
      await page.locator(".steps .step").nth(3).click();
    }
    if (folder.startsWith("07")) {
      await page.getByTestId("mixture-model").selectOption("quadratic");
      await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
    } else if (folder.startsWith("08")) {
      await (await tool(page, "saturation"))
        .getByRole("button", { name: "Ajustar curva", exact: true })
        .click();
    } else if (folder.startsWith("11")) {
      await page.getByLabel("Estrutura das observações").selectOption("repeated");
      await page.getByTestId("repeated-method").selectOption("paired");
      await page.getByRole("button", { name: "Comparar pares", exact: true }).click();
      await page.getByTestId("paired-result").waitFor();
      await page.locator(".steps .step").nth(3).click();
      await page.getByTestId("repeated-method").selectOption("mixed");
      await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
    } else {
      await page.getByLabel("Nome do projeto").fill("Potência e tamanho de amostra — exemplo");
      await (await tool(page, "power"))
        .getByRole("button", { name: "Calcular", exact: true })
        .click();
    }
    await page.getByTestId("saved-family-result").waitFor();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .enzitag)", exact: true }).click();
    const file = await (await download).path();
    if (!file) throw new Error(`No archive downloaded for ${folder}`);
    copyFileSync(file, resolve(examples, folder, "projeto.enzitag"));
    console.log(`Saved ${folder} with recorded results`);
    await page.close();
  }
} finally {
  await browser.close();
}
