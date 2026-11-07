import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openFigureMenu } from "./figureTools";
import { openPowerTool } from "./menus";

test.use({ locale: "pt-BR", acceptDownloads: true });
for (const language of ["pt-BR", "en"])
  test(`AU-U07 probability endpoints, Wilson and maximum n ${language}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.goto("/");
    for (const source of [
      { name: "zero", difference: 0, alpha: "1e-10", n: 10, rejections: 0 },
      { name: "one", difference: 10, alpha: "0.05", n: 100, rejections: 1000 },
      { name: "large-n", difference: 0, alpha: "0.05", n: 100000, rejections: null },
    ]) {
      const tool = await openPowerTool(page);
      await tool.getByTestId("power-design").selectOption("oneSampleT");
      await tool.getByTestId("power-goal").selectOption("powerAt");
      for (const [key, value] of Object.entries({
        difference: String(source.difference),
        sigma: "1",
        alpha: source.alpha,
        n: String(source.n),
      }))
        await tool.getByTestId(`power-input-${key}`).fill(value);
      await tool.getByTestId("power-simulation").check();
      await tool.getByTestId("power-simulation-seed").fill("42");
      await tool.getByTestId("power-simulation-replications").fill("1000");
      await tool.getByRole("button", { name: /^(Calcular|Calculate)$/, exact: true }).click();
      await expect(page.getByTestId("power-simulation-result")).toBeVisible();
      await page.locator("header.app-header select").first().selectOption(language);
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", {
          name: /^(Salvar \(baixar .desvtag\)|Save \(download .desvtag\))$/,
          exact: true,
        })
        .click();
      const archive = info.outputPath(`${source.name}.enzitag`);
      await (await pending).saveAs(archive);
      const bytes = unzipSync(new Uint8Array(readFileSync(archive)))["project.json"];
      if (!bytes) throw new Error("Missing project");
      const result = JSON.parse(strFromU8(bytes)).experiments[0].powerResult.records.at(-1).result;
      if (source.rejections !== null) expect(result.simulation.rejections).toBe(source.rejections);
      const figure = page.locator('[data-testid="power-chart"]:not([data-report-root] *)');
      await openFigureMenu(figure);
      await figure.getByTestId("figure-customizer").locator(":scope > summary").click();
      for (const scale of ["0.85", "1", "1.2"]) {
        await figure
          .getByLabel(/^(Tamanho da fonte desta figura|Font size for this figure)$/)
          .selectOption(scale);
        expect(
          await figure.locator(".chart-canvas svg").evaluate((root) => {
            const bounds = root.getBoundingClientRect();
            return [...root.querySelectorAll("text")]
              .filter((text) => {
                const r = text.getBoundingClientRect();
                return (
                  r.width &&
                  (r.left < bounds.left - 2 ||
                    r.right > bounds.right + 2 ||
                    r.top < bounds.top - 2 ||
                    r.bottom > bounds.bottom + 2)
                );
              })
              .map((t) => t.textContent);
          }),
        ).toEqual([]);
      }
      await figure.getByTestId("figure-menu").locator(":scope > summary").click();
      expect(await figure.locator('svg text[text-anchor="end"]').allTextContents()).toEqual(
        language === "pt-BR"
          ? ["0", "0,2", "0,4", "0,6", "0,8", "1"]
          : ["0", "0.2", "0.4", "0.6", "0.8", "1"],
      );
      const download = page.waitForEvent("download");
      await page.getByTestId("report-pdf-button").click();
      await (await download).saveAs(info.outputPath(`${source.name}-${language}.pdf`));
      await figure.screenshot({ path: info.outputPath(`${source.name}-${language}.png`) });
    }
  });
