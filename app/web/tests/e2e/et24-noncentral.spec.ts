import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool } from "./menus";

const reference = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../../validation/cases/noncentral_extreme/tails.json", import.meta.url),
    ),
    "utf8",
  ),
).power;
const labels = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../src/i18n/locales/pt-BR/common.json", import.meta.url)),
    "utf8",
  ),
).power;
test.use({ locale: "pt-BR", acceptDownloads: true });
test("T05: large noncentrality stays honest and a numerical-budget failure preserves the result", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("/");
  const tool = await openPowerTool(page);
  await tool.getByTestId("power-design").selectOption("oneSampleT");
  await tool.getByTestId("power-goal").selectOption("powerAt");
  for (const [key, value] of [
    ["difference", String(reference.request.design.difference)],
    ["sigma", "1"],
    ["alpha", "0,01"],
    ["n", "2"],
  ])
    await tool.getByRole("textbox", { name: labels[key!], exact: true }).fill(value!);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-summary")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = info.outputPath("large-effect.enzitag");
  await (await pending).saveAs(file);
  const doc = JSON.parse(strFromU8(unzipSync(new Uint8Array(readFileSync(file)))["project.json"]!));
  expect(doc.experiments[0].powerResult.records.at(-1).result.power.value).toBeCloseTo(
    reference.expected,
    9,
  );
  expect(doc.experiments[0].powerResult.records.at(-1).result.power.value).toBeLessThan(0.6);
  await page
    .getByTestId("power-result")
    .screenshot({ path: info.outputPath("large-effect-result.png") });
  const again = await openPowerTool(page);
  await again.getByTestId("power-design").selectOption("anova");
  await again.getByRole("textbox", { name: labels.means, exact: true }).fill("0;100000");
  await again.getByRole("textbox", { name: labels.alpha, exact: true }).fill("0,000000000001");
  await again.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(again.getByRole("alert")).toContainText(
    "Não foi possível calcular a distribuição com precisão",
  );
  await expect(again.getByTestId("power-stale")).toBeVisible();
  await expect(again.getByRole("alert")).toBeFocused();
  expect(
    await again.getByRole("alert").evaluate((el) => {
      const body = el.closest(".modal-body")!.getBoundingClientRect();
      const error = el.getBoundingClientRect();
      return error.top >= body.top - 1 && error.bottom <= body.bottom + 1;
    }),
  ).toBe(true);
  await expect(again.getByRole("alert")).not.toContainText("desconhecido");
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="power-dialog"]').analyze()).violations,
  ).toEqual([]);
  await page
    .getByTestId("power-dialog")
    .screenshot({ path: info.outputPath("numerical-range-diagnostic.png") });
});
