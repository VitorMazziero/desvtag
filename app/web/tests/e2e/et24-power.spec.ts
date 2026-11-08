import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool } from "./menus";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(20000);
  await page.addInitScript(() => {
    localStorage.setItem("optima.showAllSections", "1");
    const host = window as unknown as { powers: number };
    host.powers = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = message as { requestJson?: string };
      if (data.requestJson && JSON.parse(data.requestJson).operation.type === "powerAnalyze")
        host.powers++;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});
for (const name of [
  "regression_correlated",
  "regression_minimum",
  "contrast_unequal",
  "contrast_precision",
  "factorial_interaction",
])
  test(`T05-T07 ${name}: fresh analytical/simulated power, saved and reported`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const { source, tool } = await setupPower(page, name);
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="power-dialog"]').analyze()).violations,
    ).toEqual([]);
    await tool.getByTestId("power-advanced-options").scrollIntoViewIfNeeded();
    await tool
      .getByTestId("power-advanced-options")
      .screenshot({ path: info.outputPath(`${name}-options.png`) });
    await tool.getByTestId("power-simulation-options").scrollIntoViewIfNeeded();
    await page
      .getByTestId("power-dialog")
      .screenshot({ path: info.outputPath(`${name}-simulation-options.png`) });
    await tool.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByTestId("power-simulation-result")).toBeVisible();
    await expect(page.getByTestId("power-chart").locator("svg")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByTestId("power-chart")
      .screenshot({ path: info.outputPath(`${name}-curve.png`) });
    await page
      .getByTestId("power-result")
      .screenshot({ path: info.outputPath(`${name}-result.png`) });
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const file = info.outputPath(`${name}.enzitag`);
    await (await pending).saveAs(file);
    const doc = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(file)))["project.json"]!),
    );
    const record = doc.experiments[0].powerResult.records.at(-1);
    expect(record.result.n).toBe(source.result.n);
    expect(record.result.total).toBe(source.result.total);
    expect(record.result.power.value).toBeCloseTo(source.result.power.value, 9);
    expect(record.result.simulation.rejections).toBe(source.result.simulation.rejections);
    expect(record.input.design).toEqual(source.request.design);
    const svg = await page.getByTestId("power-chart").locator(".chart-canvas").innerHTML();
    await page.reload();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(file);
    await expect(page.getByTestId("power-result")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { powers: number }).powers)).toBe(0);
    expect(await page.getByTestId("power-chart").locator(".chart-canvas").innerHTML()).toBe(svg);
    for (const [id, extension] of [
      ["report-button", "html"],
      ["report-pdf-button", "pdf"],
      ["report-docx-button", "docx"],
    ]) {
      const download = page.waitForEvent("download");
      await page.getByTestId(id!).click();
      await (await download).saveAs(info.outputPath(`${name}.${extension}`));
    }
    const html = readFileSync(info.outputPath(`${name}.html`), "utf8");
    expect(html).toContain("Wilson");
    expect(html).not.toContain("powerAdvanced.");
    expect(html).toContain("Curva de potência");
    const reopened = await openPowerTool(page);
    await reopened.getByTestId("power-simulation-seed").fill("123");
    await expect(reopened.getByTestId("power-stale")).toBeVisible();
  });
test("T07: changing from precision keeps the new F design and malformed fields never reach the engine", async ({
  page,
}) => {
  await page.goto("/");
  const tool = await openPowerTool(page);
  await tool.getByTestId("power-goal").selectOption("precisionFor");
  await tool.getByTestId("power-design").selectOption("regression");
  await expect(tool.getByTestId("power-design")).toHaveValue("regression");
  await expect(tool.getByTestId("power-goal")).toHaveValue("sampleSizeFor");
  await tool.getByTestId("power-coefficients").fill("bad");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(tool.getByTestId("power-coefficients")).toHaveAttribute("aria-invalid", "true");
  await expect(tool.getByTestId("power-coefficients")).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { powers: number }).powers)).toBe(0);
});
