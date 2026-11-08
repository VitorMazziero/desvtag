import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

test.use({ locale: "pt-BR", acceptDownloads: true });
test("AU-U06: repeated mixed-model references retain row identity across paper bands", async ({
  page,
}, info) => {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(
      new URL(
        "../../../../validation/cases/project_file/repeated_advanced/advanced_covariance_inference_profiles_and_options_round_trip_without_refit.enzitag",
        import.meta.url,
      ),
    ),
  );
  await page.locator(".steps").getByRole("button").last().click();
  await expect(page.getByTestId("mixed-marginal-means")).toBeVisible();
  for (const [id, ext] of [
    ["report-pdf-button", "pdf"],
    ["report-docx-button", "docx"],
  ]) {
    if (!id || !ext) throw new Error("Missing export control");
    const pending = page.waitForEvent("download");
    await page.getByTestId(id).click();
    await (await pending).saveAs(info.outputPath(`mixed-bands.${ext}`));
  }
  const files = unzipSync(new Uint8Array(readFileSync(info.outputPath("mixed-bands.docx"))));
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("Missing document XML");
  const checked = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const rows = [...doc.getElementsByTagNameNS("*", "tbl")].map((table) =>
      [...table.getElementsByTagNameNS("*", "tr")].map((row) =>
        [...row.getElementsByTagNameNS("*", "tc")].map((c) => c.textContent),
      ),
    );
    const indexed = rows.filter((r) => r[0]?.[0] === "#");
    return {
      count: indexed.length,
      valid: indexed.every((r) => r.slice(1).every((row, i) => row[0] === String(i + 1))),
    };
  }, strFromU8(xml));
  expect(checked.count).toBeGreaterThan(0);
  expect(checked.valid).toBe(true);
});
