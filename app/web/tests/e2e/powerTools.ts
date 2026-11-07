import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { openPowerTool } from "./menus";

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          `../../../../validation/cases/power_advanced/native_parity/${name}.json`,
          import.meta.url,
        ),
      ),
      "utf8",
    ),
  );
export async function setupPower(page: Page, name: string) {
  const source = fixture(name);
  const request = source.request;
  const design = request.design;
  await page.goto("/");
  const tool = await openPowerTool(page);
  await tool.getByTestId("power-design").selectOption(design.type);
  await tool.getByTestId("power-goal").selectOption(request.goal.type);
  await tool.getByTestId("power-input-sigma").fill(String(request.sigma));
  await tool.getByTestId("power-input-alpha").fill(String(request.alpha));
  if (request.goal.type === "powerAt")
    await tool.getByTestId("power-input-n").fill(String(request.goal.n));
  else if (request.goal.type === "sampleSizeFor")
    await tool.getByTestId("power-input-target").fill(String(request.goal.power));
  else await tool.getByTestId("power-input-halfWidth").fill(String(request.goal.halfWidth));
  if (design.type === "regression") {
    await tool
      .getByTestId("power-predictors")
      .fill(design.predictors.map((r: number[]) => r.join("\t")).join("\n"));
    await tool.getByTestId("power-coefficients").fill(design.coefficients.join(";"));
  } else if (design.type === "contrast") {
    await tool.getByTestId("power-input-means").fill(design.means.join(";"));
    await tool.getByTestId("power-weights").fill(design.weights.join(";"));
    await tool.getByTestId("power-allocation").fill(design.allocation.join(";"));
  } else {
    await tool.getByTestId("power-factorCount").fill(String(design.factors));
    await tool
      .getByTestId("power-terms")
      .fill(design.terms.map((term: number[]) => term.map((f) => f + 1).join("*")).join(";"));
    await tool.getByTestId("power-effects").fill(design.effects.join(";"));
    await tool.getByTestId("power-targetTerm").selectOption(String(design.target));
  }
  if (design.type !== "regression" && request.goal.type !== "precisionFor")
    await tool
      .getByRole("checkbox", { name: "Teste bilateral", exact: true })
      .setChecked(request.twoSided);
  await tool.getByTestId("power-simulation").check();
  await tool.getByTestId("power-simulation-seed").fill(String(request.simulation.seed));
  await tool
    .getByTestId("power-simulation-replications")
    .fill(String(request.simulation.replications));
  return { source, tool };
}
