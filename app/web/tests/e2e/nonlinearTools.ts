import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { openSaturationTool } from "./menus";
import { startObjective } from "./startObjective";
export const cases = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../../validation/cases/nonlinear_profile/profile.json", import.meta.url),
    ),
    "utf8",
  ),
).cases;
export async function setupProfile(page: Page, source: (typeof cases)[number]) {
  await page.goto("/");
  await startObjective(page, "analyze");
  const pending = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…", exact: true }).click();
  await (await pending).setFiles({
    name: `${source.name}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Substrato;Resposta\n" +
        source.request.x.map((x: number, i: number) => `${x};${source.request.y[i]}`).join("\n"),
    ),
  });
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  const tool = await openSaturationTool(page);
  await tool.getByTestId("saturation-model").selectOption(source.request.model);
  await tool.getByRole("checkbox", { name: "Informar valores iniciais", exact: true }).check();
  for (let i = 0; i < source.request.initial.length; i++)
    await tool
      .getByTestId(`nonlinear-initial-${i}`)
      .fill(String(source.request.initial[i]).replace(".", ","));
  await tool.getByTestId("nonlinear-profile").check();
  return tool;
}
