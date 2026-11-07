import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
for (const action of ["cancel", "rename"] as const)
  test(`AU-P05 report ${action} after actual worker submission preserves the result and permits another export`, async ({
    page,
  }, info) => {
    await page.addInitScript((action) => {
      const host = window as unknown as {
        reportProbe: { posts: number; acted: boolean; action: string; failures: string[] };
      };
      host.reportProbe = { posts: 0, acted: false, action, failures: [] };
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
        const result = Reflect.apply(post, this, [message, ...args]);
        if ((message as { format?: string }).format === "pdf" && !host.reportProbe.acted) {
          host.reportProbe.posts++;
          // Act in the first DOM turn after the real request, avoiding a round-trip race.
          queueMicrotask(() => {
            if (action === "cancel")
              document.querySelector<HTMLButtonElement>('[data-testid="report-cancel"]')?.click();
            else {
              const field = document.querySelector<HTMLInputElement>(
                '.file-bar input[type="text"]',
              );
              const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                "value",
              )?.set;
              if (!field || !setter) throw new Error("Missing project name control");
              setter.call(field, "Changed during report");
              field.dispatchEvent(new Event("input", { bubbles: true }));
            }
            host.reportProbe.acted = true;
          });
        }
        return result;
      };
    }, action);
    const { tool } = await setupPower(page, "regression_correlated");
    await tool.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByTestId("power-result")).toBeVisible();
    const summary = await page.getByTestId("power-summary").textContent();
    let downloads = 0;
    page.on("download", () => {
      downloads++;
    });
    await page.getByTestId("report-pdf-button").click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { reportProbe: { acted: boolean } }).reportProbe.acted,
        ),
      )
      .toBe(true);
    await expect(page.getByTestId("report-pdf-button")).toBeEnabled();
    await expect(page.getByTestId("report-cancel")).toHaveCount(0);
    await expect(
      page.getByText(
        action === "cancel"
          ? "Exportação cancelada."
          : "Relatório cancelado porque os dados ou o resultado consultado mudaram. Gere novamente o relatório.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(downloads).toBe(0);
    expect(await page.getByTestId("power-summary").textContent()).toBe(summary);
    const download = page.waitForEvent("download");
    const extension = action === "cancel" ? "pdf" : "html";
    await page.getByTestId(extension === "pdf" ? "report-pdf-button" : "report-button").click();
    const file = info.outputPath(`next-report.${extension}`);
    await (await download).saveAs(file);
    expect(downloads).toBe(1);
    if (extension === "html")
      expect(readFileSync(file, "utf8")).toContain(
        'name="enzitag:project" content="Changed during report"',
      );
    else expect(readFileSync(file).subarray(0, 5).toString()).toBe("%PDF-");
    await page.screenshot({ path: info.outputPath(`after-${action}.png`), fullPage: true });
  });
