import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ locale: "pt-BR" });
for (const example of ["09-niveis-mistos", "07-misturas-scheffe"])
  test(`T14 follow-up: ${example} warnings are visible and localized`, async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…", exact: true }).click();
    await (await chooser).setFiles(
      fileURLToPath(new URL(`../../../../examples/${example}/projeto.enzitag`, import.meta.url)),
    );
    await page.locator(".steps .step").nth(2).click();
    if (example.startsWith("09")) {
      await page.getByLabel("Repetições da combinação completa", { exact: true }).fill("1");
      await expect(page.getByTestId("mixed-warning")).toContainText("erro puro");
    } else {
      await page.getByLabel("Repetições dos pontos", { exact: true }).fill("1");
      await page.getByLabel("Pontos centrais extras", { exact: true }).fill("0");
      await expect(page.getByTestId("mixture-panel")).toContainText(
        "este planejamento não permite estimar o erro puro",
      );
    }
    const panel = page.getByTestId(example.startsWith("09") ? "mixed-panel" : "mixture-panel");
    await panel.screenshot({ path: info.outputPath(`${example}-warning-pt.png`) });
    await page.locator("header.app-header select").first().selectOption("en");
    await expect(panel).toContainText("pure error");
    await expect(panel).not.toContainText(/design\.(mixed_single|mixture_no)|Unknown engine error/);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await panel.screenshot({ path: info.outputPath(`${example}-warning-en.png`) });
  });
