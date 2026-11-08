import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";
import { startObjective } from "./startObjective";

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../../validation/cases/repeated_covariance/reml.json", import.meta.url),
    ),
    "utf8",
  ),
);
export async function setupRepeated(page: Page, name: string) {
  const source = fixtures.cases.find((c: { name: string }) => c.name === name);
  await configureRepeated(page, { ...source, name });
  return source;
}

export async function configureRepeated(
  page: Page,
  source: { name: string; structure: string; rows: { unit: string; y: number; time: number }[] },
) {
  await page.goto("/");
  await startObjective(page, "analyze");
  const pending = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  const csv =
    "unit_id;Resposta;time\n" + source.rows.map((r) => `${r.unit};${r.y};${r.time}`).join("\n");
  await (await pending).setFiles({
    name: `${source.name}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
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
  await page
    .getByTestId("mixed-covariance")
    .selectOption(source.structure === "cs" ? "compoundSymmetry" : source.structure);
  await page
    .getByRole("checkbox", { name: "Informar tempo / ocasião e gerar perfis", exact: true })
    .check();
  await page
    .getByRole("combobox", { name: "Codificação dos fatores categóricos", exact: true })
    .selectOption("treatment");
  await page.getByTestId("mixed-time-effect").selectOption("categorical");
  await page
    .getByRole("checkbox", { name: "Comparar ocasiões do tempo categórico", exact: true })
    .check();
}
export async function runRepeated(page: Page, timeout?: number) {
  await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
  await expect(page.getByTestId("mixed-advanced-summary")).toBeVisible({ timeout });
}
