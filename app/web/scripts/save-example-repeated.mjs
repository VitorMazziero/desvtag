// Create a synthetic advanced example through the real app and WASM.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const root = resolve(import.meta.dirname, "../../..");
const folder = resolve(root, "examples/15-medidas-repetidas-ar1");
mkdirSync(folder, { recursive: true });
const reference = JSON.parse(
  readFileSync(resolve(root, "validation/cases/repeated_covariance/reml.json"), "utf8"),
).cases.find((c) => c.name === "ar1_positive");
const csv =
  "unit_id;Resposta;time\n" +
  reference.rows.map((row) => `${row.unit};${row.y};${row.time}`).join("\n") +
  "\n";
writeFileSync(resolve(folder, "ensaios.csv"), csv);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ locale: "pt-BR", acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Nome do projeto", { exact: true }).fill("Perfis temporais — AR(1)");
  await page.getByTestId("objective-analyze").check();
  await page.getByTestId("objective-start").click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  await (await chooser).setFiles(resolve(folder, "ensaios.csv"));
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await page.getByTestId("data-blocks-next").click();
  await page
    .getByRole("combobox", { name: "Estrutura das observações", exact: true })
    .selectOption("repeated");
  await page.getByTestId("repeated-method").selectOption("mixed");
  await page
    .getByRole("checkbox", { name: "Usar inferência e covariâncias avançadas", exact: true })
    .check();
  await page.getByTestId("mixed-covariance").selectOption("ar1");
  await page
    .getByRole("combobox", { name: "Codificação dos fatores categóricos", exact: true })
    .selectOption("treatment");
  await page.getByTestId("mixed-time-effect").selectOption("categorical");
  await page
    .getByRole("checkbox", { name: "Comparar ocasiões do tempo categórico", exact: true })
    .check();
  await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
  await page.getByTestId("mixed-profile-chart").waitFor();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .enzitag)", exact: true }).click();
  const file = await (await event).path();
  if (!file) throw new Error("No example archive");
  copyFileSync(file, resolve(folder, "projeto.enzitag"));
  const evidence = resolve(root, "app/web/test-results-example-captures/et23");
  await page
    .getByTestId("mixed-profile-chart")
    .screenshot({ path: resolve(evidence, "example-15-profiles.png") });
  console.log(
    "Saved example 15 from real UI with stored AR1, joint test, EMM, comparisons and profiles.",
  );
} finally {
  await browser.close();
}
