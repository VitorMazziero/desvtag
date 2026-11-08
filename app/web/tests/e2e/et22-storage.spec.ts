import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";

const directory = fileURLToPath(
  new URL("../../../../validation/cases/project_file/families/", import.meta.url),
);
const fields = [
  "mixtureResult",
  "mixedModelResult",
  "nonlinearResult",
  "powerResult",
  "activeFamily",
];
test.use({ locale: "pt-BR", acceptDownloads: true });

test("T02: browser loads and saves every optional family without losing recorded inputs", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".enzitag"))) {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(`${directory}/${file}`);
    await expect(page.getByLabel("Nome do projeto")).toHaveValue("Saved families");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
    const download = await pending;
    const actual = JSON.parse(
      strFromU8(unzipSync(new Uint8Array(readFileSync((await download.path())!)))["project.json"]!),
    );
    const expected = JSON.parse(
      readFileSync(`${directory}/${file.replace(".enzitag", ".json")}`, "utf8"),
    );
    for (const field of fields)
      expect(actual.experiments[0][field], `${file}: ${field}`).toEqual(
        expected.experiments[0][field],
      );
    expect(actual.experiments[0].comments).toEqual(expected.experiments[0].comments);
    await download.saveAs(info.outputPath(file));
  }
  await page.screenshot({ path: info.outputPath("T02-loaded-and-saved.png") });
});

test("T02: first project and initial revision use the actual creation time", async ({ page }) => {
  const start = Date.now();
  await page.goto("/");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const archive = unzipSync(new Uint8Array(readFileSync((await (await pending).path())!)));
  const document = JSON.parse(strFromU8(archive["project.json"]!));
  expect(Date.parse(document.createdAt)).toBeGreaterThanOrEqual(start - 1000);
  expect(Date.parse(document.experiments[0].revisions[0].createdAt)).toBeGreaterThanOrEqual(
    start - 1000,
  );
});
