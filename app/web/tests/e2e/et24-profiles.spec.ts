import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openSaturationTool } from "./menus";
import { cases, setupProfile } from "./nonlinearTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(20_000);
  await page.addInitScript(() => {
    localStorage.setItem("optima.showAllSections", "1");
    const host = window as unknown as { fits: number };
    host.fits = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const r = message as { requestJson?: string };
      if (r.requestJson && JSON.parse(r.requestJson).operation.type === "modelNonlinear")
        host.fits++;
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});
for (const source of cases)
  test(`T02-T04 ${source.name}: fresh profile, saved history and reports`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    const tool = await setupProfile(page, source);
    await tool
      .getByTestId("nonlinear-options")
      .screenshot({ path: info.outputPath(`${source.name}-options.png`) });
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="saturation-dialog"]').analyze())
        .violations,
    ).toEqual([]);
    await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
    await expect(page.getByTestId("likelihood-profiles")).toBeVisible();
    await expect(page.getByTestId("likelihood-profile-limits").locator("tbody tr")).toHaveCount(
      source.request.initial.length,
    );
    for (const letter of [
      "a",
      "b",
      ...(source.request.model === "monod" ? [] : [source.request.model === "hill" ? "n" : "c"]),
    ])
      await expect(page.getByTestId(`likelihood-profile-${letter}`).locator("svg")).toBeVisible();
    await page
      .getByTestId("likelihood-profiles")
      .screenshot({ path: info.outputPath(`${source.name}-limits.png`) });
    await page
      .getByTestId("likelihood-profile-a")
      .screenshot({ path: info.outputPath(`${source.name}-profile.png`) });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const event = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const archive = info.outputPath(`${source.name}.enzitag`);
    await (await event).saveAs(archive);
    const doc = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync(archive)))["project.json"]!),
    );
    const record = doc.experiments[0].nonlinearResult.records.at(-1);
    expect(record.result.provenance.methodVersion).toBe(2);
    for (let i = 0; i < record.result.profiles.length; i++) {
      expect(record.result.profiles[i].lower.value).toBeCloseTo(source.expected.intervals[i][0], 2);
      expect(record.result.profiles[i].upper.value).toBeCloseTo(source.expected.intervals[i][1], 2);
    }
    await page.reload();
    const open = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await open).setFiles(archive);
    await expect(page.getByTestId("likelihood-profiles")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { fits: number }).fits)).toBe(0);
    for (const [id, ext] of [
      ["report-button", "html"],
      ["report-pdf-button", "pdf"],
      ["report-docx-button", "docx"],
    ]) {
      const download = page.waitForEvent("download");
      await page.getByTestId(id!).click();
      await (await download).saveAs(info.outputPath(`${source.name}.${ext}`));
    }
    const html = readFileSync(info.outputPath(`${source.name}.html`), "utf8");
    expect(html).toContain("Perfil de verossimilhança");
    expect(html).not.toContain("profile.status.");
    const again = await openSaturationTool(page);
    await expect(again.getByTestId("nonlinear-profile")).toBeChecked();
    await again.getByTestId("nonlinear-upper-0").fill("0,0001");
    await expect(again.getByRole("button", { name: "Ajustar curva", exact: true })).toBeDisabled();
    await expect(again.getByTestId("saturation-stale")).toBeVisible();
  });
test("T04: invalid bounds stay at the field and changing model clears dependent values", async ({
  page,
}) => {
  const tool = await setupProfile(page, cases[0]);
  await tool.getByTestId("nonlinear-lower-0").fill("-1");
  await expect(tool.getByTestId("nonlinear-lower-0")).toHaveAttribute("aria-invalid", "true");
  await expect(tool.getByRole("button", { name: "Ajustar curva", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { fits: number }).fits)).toBe(0);
  await tool.getByTestId("saturation-model").selectOption("hill");
  await expect(
    tool.getByRole("checkbox", { name: "Informar valores iniciais", exact: true }),
  ).not.toBeChecked();
  await expect(tool.getByTestId("nonlinear-lower-0")).toHaveValue("");
});
