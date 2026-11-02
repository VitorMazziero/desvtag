import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { showAllSections } from "./showAll";

// Exemplos 07 (misturas) e 08 (Monod): o projeto distribuído abre e os resultados conferem com a
// regressão independente registrada no README de cada exemplo.

test.use({ locale: "pt-BR" });

const example = (name: string) =>
  fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url));

async function open(page: Page, name: string) {
  await showAllSections(page);
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…" }).click();
  await (await chooser).setFiles(example(name));
}

const number = (text: string | null) => Number((text ?? "").replace(/\s/g, "").replace(",", "."));

test("exemplo 07: Scheffé quadrático recupera os coeficientes do README", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "07-misturas-scheffe");
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo" }).click();
  const rows = page.getByTestId("scheffe-coefficients").locator("tbody tr");
  await expect(rows).toHaveCount(6);
  const estimates = await rows.evaluateAll((trs) =>
    trs.map((tr) => tr.querySelector("td")?.textContent ?? ""),
  );
  const expected = [10.0055, 19.9855, 30.0055, 25.0302, 0.0702, -0.0098];
  for (const [i, value] of expected.entries())
    expect(Math.abs(number((estimates[i] ?? "").replace("−", "-")) - value)).toBeLessThan(5e-4);
  await expect(page.getByTestId("ternary-plot")).toBeVisible();
});

test("exemplo 08: Monod recupera Vmax e Km do README", async ({ page }) => {
  test.setTimeout(120_000);
  await open(page, "08-saturacao-monod");
  const panel = page.getByTestId("saturation-fit");
  await panel.getByText(/Curvas de saturação/).click();
  await panel.getByRole("button", { name: "Ajustar curva" }).click();
  const rows = page.getByTestId("saturation-parameters").locator("tbody tr");
  await expect(rows).toHaveCount(2);
  const first = (i: number) => rows.nth(i).locator("td").first().textContent();
  expect(Math.abs(number(await first(0)) - 3.0022)).toBeLessThan(5e-4);
  expect(Math.abs(number(await first(1)) - 2.4983)).toBeLessThan(5e-4);
});
