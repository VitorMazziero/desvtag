import type { Locator } from "@playwright/test";

export async function clickAfterFocus(control: Locator) {
  // O foco pode mover a página. Posiciona o controle antes de enviar o clique.
  await control.focus();
  await control.scrollIntoViewIfNeeded();
  await control.click();
}
