import type { Locator } from "@playwright/test";

export async function openFigureMenu(figure: Locator) {
  const menu = figure.getByTestId("figure-menu");
  if (await menu.evaluate((e) => (e as HTMLDetailsElement).open)) return;
  const toggle = menu.locator(":scope > summary");
  await toggle.focus();
  await toggle.click();
}
