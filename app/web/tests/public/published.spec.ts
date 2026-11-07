import { expect, test } from "@playwright/test";
import { clickAfterFocus } from "../e2e/clickAfterFocus";

// Percurso mínimo na URL publicada, com o motor WebAssembly real servido pelo GitHub Pages:
// versão do motor, comparação de tratamentos (ANOVA e letras) e nenhuma requisição externa.

test.use({ locale: "pt-BR" });

test("a versão publicada abre, calcula e não usa rede externa", async ({ page, baseURL }) => {
  const external: string[] = [];
  const origin = new URL(baseURL ?? "https://vitormazziero.github.io").origin;
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:"))
      external.push(url);
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  // Exibe os blocos e as seções para exercitar a comparação em um percurso curto.
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await page.goto("./");
  await expect(page).toHaveTitle("DesvTAG");
  const about = page.getByTestId("about-menu").locator(":scope > summary");
  await about.click();
  await expect(page.getByTestId("developer-credit")).toHaveText(
    "Desenvolvido por Vítor Teixeira Mazziero",
  );
  await expect(page.getByTestId("engine-version")).toHaveText(
    process.env.EXPECTED_VERSION ?? "0.4.0",
  );
  await expect(page.getByTestId("engine-methods")).toContainText("descriptive_summary");

  await about.click();
  await page.getByRole("radio", { name: "Comparar tratamentos" }).check();
  await page.getByRole("button", { name: "Começar", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
  await clickAfterFocus(page.getByRole("button", { name: "Adicionar linha" }));
  const rows = [
    ...[10.1, 10.3, 9.9, 10.2].map((v) => ["A", v]),
    ...[12.0, 12.4, 11.8, 12.1].map((v) => ["B", v]),
    ...[15.0, 15.3, 14.8, 15.1].map((v) => ["C", v]),
  ];
  await page.getByLabel("Condição — Obs. 1", { exact: true }).evaluate(
    (el, value) => {
      const data = new DataTransfer();
      data.setData("text/plain", value);
      const event = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "clipboardData", { value: data });
      el.dispatchEvent(event);
    },
    rows.map(([l, v]) => `${l}\t${String(v).replace(".", ",")}`).join("\n"),
  );
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByLabel("Fator que define os grupos").selectOption({ label: "Condição" });
  await page.getByRole("button", { name: "Comparar tratamentos" }).click();
  await expect(page.getByTestId("anova-table")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("letters-0")).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
