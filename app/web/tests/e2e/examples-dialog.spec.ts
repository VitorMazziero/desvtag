import { expect, test } from "@playwright/test";
import { openExamplesTool } from "./menus";

// A tela inicial não tem mais o cartão de projetos recentes: os exemplos ficam no menu «Extras».

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });

test("os exemplos abrem pelo menu Extras e o cartão de recentes não existe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("objective-start")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projetos recentes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Abrir exemplo" })).toHaveCount(0);

  const list = await openExamplesTool(page);
  await expect(list.getByRole("listitem")).toHaveCount(18);
  await expect(list.getByRole("button", { name: "Abrir", exact: true })).toHaveCount(18);
  await list.getByTestId("open-example-01").click();

  await expect(page.getByTestId("examples-dialog")).toBeHidden();
  await expect(page.getByTestId("results-layout")).toBeVisible();
  await expect(page.getByLabel("Nome do projeto")).not.toHaveValue("");
});
