import type { Page } from "@playwright/test";

export async function startObjective(page: Page, objective: "plan" | "analyze" | "compare") {
  await page.getByTestId(`objective-${objective}`).check();
  await page.getByTestId("objective-start").click();
}
