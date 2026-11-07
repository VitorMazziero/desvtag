import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as { operations: string[] };
    host.operations = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const json = (message as { requestJson?: string }).requestJson;
      if (json) host.operations.push(JSON.parse(json).operation.type);
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

async function openExample(page: Page, slug: string) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(new URL(`../../../../examples/${slug}/projeto.enzitag`, import.meta.url)),
  );
  await page.locator(".steps .step").nth(4).click();
}

test("exemplo 18 abre região limitada, Cox e compromisso salvos", async ({ page }, info) => {
  await openExample(page, "18-mistura-limitada-cox");
  await expect(page.getByTestId("cox-plot").locator("polyline[data-cox-series]")).toHaveCount(3);
  const optimum = page.getByTestId("mixture-optimum-results");
  await expect(optimum).toBeVisible();
  await expect(optimum.getByTestId("mixture-optimum-predictions").locator("tbody tr")).toHaveCount(
    2,
  );
  await expect(optimum.getByTestId("mixture-optimum-candidates").locator("tbody tr")).toContainText(
    "0,5",
  );
  await optimum.screenshot({ path: info.outputPath("example-18-compromise.png") });
  const operations = await page.evaluate(
    () => (window as unknown as { operations: string[] }).operations,
  );
  expect(operations).not.toContain("mixtureAnalyze");
});

test("exemplo 19 mantém o desenho consultado separado do modelo ampliado", async ({
  page,
}, info) => {
  await openExample(page, "19-otimo-misto-em-blocos");
  await expect(page.getByTestId("optimal-model-summary")).toContainText("posto 5 de 5");
  await expect(page.getByTestId("optimal-model-coefficients")).toContainText("Block[Antes]");
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  const archive = page.getByRole("combobox", { name: "Consultar planejamento salvo", exact: true });
  await expect(archive).toHaveValue("a1");
  await expect(page.getByTestId("optimal-archive-context")).toBeVisible();
  await archive.selectOption("");
  const panel = page.getByTestId("optimal-variance-panel");
  await expect(panel.getByRole("combobox", { name: "Bloco no mapa", exact: true })).toHaveValue(
    "1",
  );
  await expect(panel.getByTestId("optimal-variance-spatial")).toContainText("Condição: B");
  await expect(panel.locator("dd").nth(1)).toContainText("4,96");
  await panel.screenshot({ path: info.outputPath("example-19-block-profile.png") });
  const operations = await page.evaluate(
    () => (window as unknown as { operations: string[] }).operations,
  );
  expect(
    operations.filter((type) =>
      ["designOptimalGenerate", "designOptimalAnalyze", "designOptimalVariance"].includes(type),
    ),
  ).toEqual([]);
});
