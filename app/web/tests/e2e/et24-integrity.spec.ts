import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool } from "./menus";
import { setupProfile } from "./nonlinearTools";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { calculations: number };
    host.calculations = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = message as { requestJson?: string };
      if (
        data.requestJson &&
        ["modelNonlinear", "powerAnalyze"].includes(JSON.parse(data.requestJson).operation.type)
      )
        host.calculations++;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});
async function saveAndReopen(page: Page, info: TestInfo, name: string, resultId: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = info.outputPath(`${name}.enzitag`);
  await (await download).saveAs(file);
  const doc = JSON.parse(strFromU8(unzipSync(new Uint8Array(readFileSync(file)))["project.json"]!));
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByTestId(resultId)).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { calculations: number }).calculations),
  ).toBe(0);
  return doc;
}

for (const kind of ["contrast", "twoLevel"])
  test(`AU-P04: ${kind} retains valid precision, unavailable power and requested simulation across persistence and reports`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await page.goto("/");
    const tool = await openPowerTool(page);
    await tool.getByTestId("power-design").selectOption(kind);
    await tool.getByTestId("power-goal").selectOption("precisionFor");
    await tool.getByTestId("power-input-sigma").fill("1e-308");
    await tool.getByTestId("power-input-halfWidth").fill("1e-307");
    if (kind === "contrast") {
      await tool.getByTestId("power-input-means").fill("0;1e308");
      await tool.getByTestId("power-weights").fill("-1;1");
      await tool.getByTestId("power-allocation").fill("1;1");
    } else if (kind === "twoLevel") {
      await tool.getByTestId("power-factorCount").fill("1");
      await tool.getByTestId("power-terms").fill("1");
      await tool.getByTestId("power-effects").fill("1e308");
      await tool.getByTestId("power-targetTerm").selectOption("0");
    }
    await tool.getByTestId("power-simulation").check();
    await tool.getByTestId("power-simulation-seed").fill("42");
    await tool.getByTestId("power-simulation-replications").fill("1000");
    await tool.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByTestId("power-summary")).toContainText("semiamplitude");
    await expect(
      page.getByTestId("power-warning").filter({ hasText: "fora da faixa numérica" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("power-warning").filter({ hasText: "nenhuma simulação" }),
    ).toBeVisible();
    await expect(page.getByTestId("power-chart")).toHaveCount(0);
    await expect(page.getByTestId("power-curve")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const doc = await saveAndReopen(page, info, `partial-${kind}`, "power-result");
    const record = doc.experiments[0].powerResult.records.at(-1);
    expect(record.result.n).toBe(2);
    expect(record.result.noncentrality).toBeNull();
    expect(record.result.power.status).toBe("undefined");
    expect(record.result.simulation).toBeUndefined();
    expect(record.input.simulation).toEqual({ seed: 42, replications: 1000 });
    for (const language of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(language);
      await expect(page.getByTestId("power-summary")).toContainText(
        language === "en" ? "half-width" : "semiamplitude",
      );
      for (const [button, extension] of [
        ["report-button", "html"],
        ["report-pdf-button", "pdf"],
        ["report-docx-button", "docx"],
      ]) {
        const download = page.waitForEvent("download");
        await page.getByTestId(button!).click();
        await (await download).saveAs(info.outputPath(`${kind}-${language}.${extension}`));
      }
      const html = readFileSync(info.outputPath(`${kind}-${language}.html`), "utf8");
      expect(html).toContain(
        language === "en" ? "outside the available numerical range" : "fora da faixa numérica",
      );
      expect(html).not.toMatch(/NaN|Infinity|power\.analytical_unavailable|\{\{/);
      await page
        .getByTestId("power-result")
        .screenshot({ path: info.outputPath(`${kind}-${language}.png`) });
    }
  });
test("AU-P04: legacy precision avoids intermediate overflow and survives persistence", async ({
  page,
}, info) => {
  await page.goto("/");
  const tool = await openPowerTool(page);
  await tool.getByTestId("power-design").selectOption("oneSampleT");
  await tool.getByTestId("power-goal").selectOption("precisionFor");
  await tool.getByTestId("power-input-sigma").fill("1e308");
  await tool.getByTestId("power-input-halfWidth").fill("1e308");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-summary")).toContainText("7 unidades");
  const doc = await saveAndReopen(page, info, "legacy-precision", "power-result");
  const record = doc.experiments[0].powerResult.records.at(-1);
  expect(record.input.design.difference).toBe(0); // Precision does not request an assumed effect in this UI.
  expect(record.result.n).toBe(7);
  expect(record.result.halfWidth.value / 1e308).toBeCloseTo(0.9248457483180448, 10);
  expect(record.result.power.status).toBe("defined");
  await page
    .getByTestId("power-result")
    .screenshot({ path: info.outputPath("legacy-precision.png") });
});

test("AU-B02: exact fit keeps estimates, explicit unavailable inference, persistence and all exports", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const x = [0.1, 0.5, 1, 2, 4, 8];
  const tool = await setupProfile(page, {
    name: "exact-monod",
    request: { model: "monod", x, y: x.map((s) => (10 * s) / (2 + s)), initial: [10, 2] },
  });
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  const warning = page
    .getByTestId("saturation-warning")
    .filter({ hasText: "Inferência e faixa de confiança indisponíveis" });
  await expect(warning).toBeVisible();
  await expect(
    page.locator('[data-testid="saturation-result"] [data-section="summary"]'),
  ).toContainText("Inferência e faixa de confiança indisponíveis");
  await expect(page.getByTestId("likelihood-profile-unavailable-a")).toBeVisible();
  await expect(page.getByTestId("likelihood-profile-a")).toHaveCount(0);
  const parameters = page.getByTestId("saturation-parameters");
  await expect(parameters.locator("tbody tr")).toHaveCount(2);
  await expect(parameters.locator("tbody tr").first()).toContainText("—");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByTestId("saturation-result")
    .screenshot({ path: info.outputPath("exact-fit.png") });
  const doc = await saveAndReopen(page, info, "exact-fit", "saturation-result");
  const result = doc.experiments[0].nonlinearResult.records.at(-1).result;
  expect(result.sse).toBe(0);
  expect(result.correlation).toEqual([]);
  for (const p of result.parameters)
    for (const field of ["stdError", "tValue", "pValue", "ciLower", "ciUpper"])
      expect(p[field].status).toBe("undefined");
  await expect(warning).toBeVisible();
  for (const [id, ext] of [
    ["report-button", "html"],
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    const download = page.waitForEvent("download");
    await page.getByTestId(id!).click();
    await (await download).saveAs(info.outputPath(`exact-fit.${ext}`));
  }
  const html = readFileSync(info.outputPath("exact-fit.html"), "utf8");
  expect(html).toContain("Inferência e faixa de confiança indisponíveis");
  expect(html).not.toMatch(/NaN|Infinity|nonlinear\.inference_unavailable/);
  for (const ext of ["CSV", "XLSX"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: `Parâmetros (${ext})`, exact: true }).click();
    await (await download).saveAs(info.outputPath(`exact-fit.${ext.toLowerCase()}`));
  }
  const csv = readFileSync(info.outputPath("exact-fit.csv"), "utf8");
  expect(
    csv
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n"),
  ).not.toMatch(/NaN|Infinity|null/);
  // Undefined inference is exported as empty cells, never zero or one.
  expect(csv).toMatch(/a[;,]10(?:[;,]){4}/);
});
for (const scale of [1e-160, 1e160])
  test(`AU-B04: contrast in response units ${scale} calculates and reopens`, async ({
    page,
  }, info) => {
    const { tool } = await setupPower(page, "contrast_unequal");
    await tool.getByTestId("power-input-sigma").fill(String(scale));
    await tool.getByTestId("power-input-means").fill(`0;${scale}`);
    await tool.getByTestId("power-weights").fill("-1;1");
    await tool.getByTestId("power-allocation").fill("1;1");
    await tool.getByTestId("power-input-n").fill("10");
    await tool.getByTestId("power-input-alpha").fill("0.05");
    await tool.getByRole("checkbox", { name: "Teste bilateral", exact: true }).check();
    await tool.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByTestId("power-result")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByTestId("power-result")
      .screenshot({ path: info.outputPath("scaled-contrast.png") });
    const doc = await saveAndReopen(page, info, "scaled-contrast", "power-result");
    const result = doc.experiments[0].powerResult.records.at(-1).result;
    expect(result.power.value).toBeCloseTo(0.5620066465862328, 10);
    expect(result.total).toBe(20);
    expect(result.df1).toBe(18);
  });
