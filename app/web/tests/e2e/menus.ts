import { expect, type Page } from "@playwright/test";

// Ajudantes dos menus do cabeçalho (ET29): «Extras» (potência e curvas de saturação) e «Sobre e
// atualizações» (histórico de versões, motor científico e atualizações).

async function openMenu(page: Page, testId: string) {
  const menu = page.getByTestId(testId);
  if ((await menu.getAttribute("open")) === null) await menu.locator(":scope > summary").click();
  await expect(menu).toHaveAttribute("open", "");
}

/** Abre «Sobre e atualizações» (o painel fica visível até Esc ou clique fora). */
export const openAbout = (page: Page) => openMenu(page, "about-menu");

/** Abre a janela da calculadora de potência pelo menu «Extras». */
export async function openPowerTool(page: Page) {
  await openMenu(page, "extras-menu");
  await page.getByTestId("open-power").click();
  await expect(page.getByTestId("power-dialog")).toBeVisible();
  return page.getByTestId("power-dialog").getByTestId("power-calculator");
}

/** Abre a janela das curvas de saturação pelo menu «Extras». */
export async function openSaturationTool(page: Page) {
  await openMenu(page, "extras-menu");
  await page.getByTestId("open-saturation").click();
  await expect(page.getByTestId("saturation-dialog")).toBeVisible();
  return page.getByTestId("saturation-dialog").getByTestId("saturation-fit");
}

/** Abre a janela de exemplos pelo menu «Extras». */
export async function openExamplesTool(page: Page) {
  await openMenu(page, "extras-menu");
  await page.getByTestId("open-examples").click();
  await expect(page.getByTestId("examples-dialog")).toBeVisible();
  return page.getByTestId("examples-dialog").getByTestId("examples-list");
}

/** Abre o menu «Mais» da barra do arquivo (Google Drive, salvar como…). */
export const openFileMenu = (page: Page) => openMenu(page, "file-menu");
