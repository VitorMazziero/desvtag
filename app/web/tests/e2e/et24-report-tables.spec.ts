import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
for (const predictorsCount of [2, 7, 32])
  for (const language of ["pt-BR", "en"])
    test(`AU-U05/U06 ${predictorsCount + 1} columns ${language}: full paper and data exports`, async ({
      page,
    }, info) => {
      test.setTimeout(180000);
      const { tool } = await setupPower(page, "regression_correlated");
      const rows = Array.from({ length: 64 }, (_, row) =>
        Array.from({ length: predictorsCount }, (_, col) => {
          let bits = row & (col + 1),
            parity = 0;
          while (bits) {
            parity ^= bits & 1;
            bits >>>= 1;
          }
          return parity ? -1.23456789e100 : 1.23456789e100;
        }),
      );
      await tool.getByTestId("power-predictors").fill(rows.map((row) => row.join("\t")).join("\n"));
      await tool
        .getByTestId("power-coefficients")
        .fill(Array(predictorsCount).fill("1e-101").join(";"));
      await tool.getByTestId("power-simulation").uncheck();
      await tool.getByRole("button", { name: "Calcular", exact: true }).click();
      await expect(page.getByTestId("power-result")).toBeVisible();
      await page.locator("header.app-header select").first().selectOption(language);
      const matrix = page.getByTestId("power-predictor-matrix");
      await expect(matrix.locator("tbody tr")).toHaveCount(20);
      const start = performance.now();
      for (const [id, ext] of [
        ["report-button", "html"],
        ["report-pdf-button", "pdf"],
        ["report-docx-button", "docx"],
      ]) {
        if (!id || !ext) throw new Error("Missing export control");
        const pending = page.waitForEvent("download");
        await page.getByTestId(id).click();
        await (await pending).saveAs(
          info.outputPath(`matrix-${predictorsCount + 1}-${language}.${ext}`),
        );
      }
      const html = readFileSync(
        info.outputPath(`matrix-${predictorsCount + 1}-${language}.html`),
        "utf8",
      );
      const table = html.match(
        /<section data-testid="power-predictor-matrix"[\s\S]*?<\/section>/,
      )?.[0];
      expect(table?.match(/<tr>/g)).toHaveLength(65);
      expect(table).not.toMatch(/Showing|Exibindo|Mostrar tudo|Show all/);
      const docx = unzipSync(
        new Uint8Array(
          readFileSync(info.outputPath(`matrix-${predictorsCount + 1}-${language}.docx`)),
        ),
      );
      const xml = docx["word/document.xml"];
      if (!xml) throw new Error("Missing document");
      const bands = await page.evaluate((xml) => {
        const doc = new DOMParser().parseFromString(xml, "application/xml");
        return [...doc.getElementsByTagNameNS("*", "tbl")]
          .map((tbl) => {
            const rows = [...tbl.getElementsByTagNameNS("*", "tr")];
            const cells = [...(rows[0]?.getElementsByTagNameNS("*", "tc") ?? [])];
            return { headers: cells.map((c) => c.textContent), rows: rows.length };
          })
          .filter((t) =>
            t.headers.some(
              (h) =>
                h === "X1" ||
                h === "X6" ||
                h === "X11" ||
                h === "X16" ||
                h === "X21" ||
                h === "X26" ||
                h === "X31",
            ),
          );
      }, strFromU8(xml));
      expect(bands).toHaveLength(predictorsCount <= 5 ? 1 : Math.ceil(predictorsCount / 5));
      expect(bands.every((b) => b.rows === 65 && b.headers.length <= 6)).toBe(true);
      expect(bands.flatMap((b) => b.headers.slice(1))).toEqual(
        Array.from({ length: predictorsCount }, (_, i) => `X${i + 1}`),
      );
      for (const ext of ["CSV", "XLSX"]) {
        const pending = page.waitForEvent("download");
        await matrix.getByRole("button", { name: new RegExp(`\\(${ext}\\)$`) }).click();
        await (await pending).saveAs(
          info.outputPath(`matrix-${predictorsCount + 1}.${ext.toLowerCase()}`),
        );
      }
      const csv = readFileSync(info.outputPath(`matrix-${predictorsCount + 1}.csv`), "utf8")
        .split(/\r?\n/)
        .filter((row) => row.trim() && !row.trimStart().startsWith("#"));
      expect(csv).toHaveLength(65);
      expect(csv.at(-1)?.split(",")).toHaveLength(predictorsCount + 1);
      for (let i = 1; i < csv.length; i++) {
        const cells = csv[i]?.split(",").map(Number);
        expect(cells?.[0]).toBe(i);
        expect(cells?.slice(1)).toEqual(rows[i - 1]);
      }
      const xlsx = unzipSync(
        new Uint8Array(readFileSync(info.outputPath(`matrix-${predictorsCount + 1}.xlsx`))),
      );
      const sheet = xlsx["xl/worksheets/sheet1.xml"];
      if (!sheet) throw new Error("Missing sheet");
      expect(strFromU8(sheet).match(/<row\b/g)).toHaveLength(65);
      writeFileSync(
        info.outputPath("export-cost.json"),
        JSON.stringify(
          {
            elapsedMilliseconds: performance.now() - start,
            rows: 64,
            columns: predictorsCount + 1,
            language,
          },
          null,
          2,
        ),
      );
    });
