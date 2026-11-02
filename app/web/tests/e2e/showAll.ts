import type { Page } from "@playwright/test";

/** Mantém o comportamento de página única nos testes que ainda não navegam pela barra lateral. */
export const showAllSections = (page: Page) =>
  page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
