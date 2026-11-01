import { expect, test } from "@playwright/test";

// Executa o build de produção com o motor Rust real compilado para WebAssembly,
// rodando em um Worker (sem transporte simulado).

test.describe("engine.info via WebAssembly Worker (rodapé do aplicativo)", () => {
  test.use({ locale: "pt-BR" });

  test("shows the real engine versions in Portuguese by default for a pt-BR system", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
    await expect(page.getByTestId("engine-protocol")).toHaveText("1");
    await expect(page.getByTestId("engine-schema")).toHaveText("1");
    await expect(page.getByTestId("engine-environment")).toContainText("Navegador");
    await expect(page.getByTestId("engine-methods")).toContainText("descriptive_summary v1");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "soft-light");
  });

  test("switching language and theme keeps the engine result and persists the choice", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");

    await page.locator("header.app-header").getByLabel("Idioma").selectOption("en");
    await expect(page.getByTestId("engine-environment")).toContainText("Browser");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");

    await page.getByLabel("Theme").selectOption("modern-dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "modern-dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "modern-dark");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
  });

  test("is operable by keyboard: skip link first, visible focus", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Ir para o conteúdo" });
    await expect(skip).toBeFocused();
    const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
    await page.keyboard.press("Tab");
    await expect(page.locator("header.app-header").getByLabel("Idioma")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Tema")).toBeFocused();
  });
});

test.describe("first access in English", () => {
  test.use({ locale: "en-US" });

  test("detects the system language", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("engine-environment")).toContainText("Browser");
  });
});

test.describe("theme screenshots", () => {
  test.use({ locale: "pt-BR" });
  for (const theme of ["soft-light", "modern-dark", "professional"]) {
    test(`renders ${theme}`, async ({ page }, testInfo) => {
      await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
      await page.goto("/");
      await expect(page.getByTestId("engine-version")).toHaveText("0.1.0");
      await page.screenshot({ path: testInfo.outputPath(`${theme}.png`), fullPage: true });
      const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(ground).not.toBe("rgba(0, 0, 0, 0)");
    });
  }
});
