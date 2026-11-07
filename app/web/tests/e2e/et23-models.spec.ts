import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { runRepeated, setupRepeated } from "./repeatedTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(20_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
});
for (const name of [
  "cs_balanced",
  "ar1_positive",
  "ar1_negative_gaps",
  "un_heterogeneous",
  "un_missing",
]) {
  test(`T03–T07: ${name} from scratch, stored and exported`, async ({ page }, info) => {
    test.setTimeout(120_000);
    const source = await setupRepeated(page, name);
    await page
      .getByTestId("mixed-options")
      .screenshot({ path: info.outputPath(`${name}-options.png`) });
    await runRepeated(page);
    await expect(page.getByTestId("mixed-term-tests").locator("tbody tr")).toHaveCount(1);
    await expect(page.getByTestId("mixed-marginal-means").locator("tbody tr")).toHaveCount(
      source.q,
    );
    await expect(page.getByTestId("mixed-marginal-comparisons").locator("tbody tr")).toHaveCount(
      (source.q * (source.q - 1)) / 2,
    );
    await expect(page.getByTestId("mixed-profile-chart").locator("svg")).toBeVisible();
    if (source.structure === "unstructured") {
      await expect(page.getByTestId("mixed-covariance-matrix")).toBeVisible();
      await expect(page.getByTestId("mixed-random-effects")).toHaveCount(0);
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByTestId("saved-family-result")
      .screenshot({ path: info.outputPath(`${name}-results.png`) });
    await page
      .getByTestId("mixed-profile-chart")
      .screenshot({ path: info.outputPath(`${name}-profiles.png`) });
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const download = await pending;
    const path = info.outputPath(`${name}.enzitag`);
    await download.saveAs(path);
    const doc = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(path)))["project.json"]!),
    );
    const record = doc.experiments[0].mixedModelResult.records.at(-1);
    expect(record.result.advanced.covariance).toBe(
      source.structure === "cs" ? "compoundSymmetry" : source.structure,
    );
    expect(record.result.provenance.methodVersion).toBe(2);
    expect(record.input.request.advanced.times).toHaveLength(source.rows.length);
    expect(record.result.advanced.remlLogLikelihood).toBeCloseTo(-source.expected.nll, 5);
    await page.reload();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(path);
    await expect(page.getByTestId("mixed-profile-chart")).toBeVisible();
    for (const [id, extension] of [
      ["report-button", "html"],
      ["report-pdf-button", "pdf"],
      ["report-docx-button", "docx"],
    ]) {
      const event = page.waitForEvent("download");
      await page.getByTestId(id!).click();
      await (await event).saveAs(info.outputPath(`${name}.${extension}`));
    }
    const html = readFileSync(info.outputPath(`${name}.html`), "utf8");
    expect(html).toContain("Testes conjuntos");
    expect(html).toContain("Perfis por unidade");
    expect(html).not.toContain("mixedAdvanced.");
  });
}
test("T02/T07: invalid temporal index keeps the previous valid result", async ({ page }) => {
  await setupRepeated(page, "ar1_positive");
  await runRepeated(page);
  await page.locator(".steps .step").nth(2).click();
  await page.getByRole("textbox", { name: "Tempo / ocasião — Obs. 2", exact: true }).fill("0,5");
  await page.locator(".steps .step").nth(3).click();
  await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("diferenças inteiras");
  await page.locator(".steps .step").nth(4).click();
  await expect(page.getByTestId("mixed-advanced-summary")).toBeVisible();
  await expect(
    page.getByTestId("saved-family-result").locator(":scope > .stale-notice"),
  ).toBeVisible();
});
