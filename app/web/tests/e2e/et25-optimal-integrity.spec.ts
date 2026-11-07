import { writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { clickAfterFocus } from "./clickAfterFocus";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 } });

async function beginFourFactorSearch(page: Page, starts: number) {
  await page.goto("/");
  await startObjective(page, "plan");
  for (let index = 0; index < 4; index++) {
    await clickAfterFocus(page.getByRole("button", { name: "Adicionar fator", exact: true }));
    await page
      .getByLabel("Nome", { exact: true })
      .nth(index)
      .fill(`X${index + 1}`);
    await page.getByLabel("Tipo").nth(index).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(4).fill("Atividade");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  for (let index = 1; index <= 4; index++) {
    await page.getByLabel(`Limite baixo de X${index}`).fill("-1");
    await page.getByLabel(`Limite alto de X${index}`).fill("1");
  }
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("quadratic");
  await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption("i");
  await page.getByLabel("Total de ensaios", { exact: true }).fill("60");
  await page
    .getByRole("combobox", { name: "Níveis por fator na malha", exact: true })
    .selectOption("5");
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill(String(starts));
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("1");
}

test("ótimo I: limite real de 60 passagens preserva o desenho e avisa", async ({ page }, info) => {
  test.setTimeout(120_000);
  await beginFourFactorSearch(page, 1);
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  await expect(page.getByTestId("optimal-stop")).toContainText("Busca limitada");
  await expect(page.getByTestId("optimal-table").locator("tbody tr")).toHaveCount(60);
  await page.getByTestId("optimal-search-details").locator("summary").click();
  await expect(page.getByTestId("optimal-search-details")).toContainText(
    "limitados por passagens (1)",
  );
  await page.getByTestId("optimal-result").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("limited-search.png") });
});

test("ótimo D/I diagnostica uma faixa sem níveis intermediários", async ({ page }, info) => {
  await beginFourFactorSearch(page, 1);
  await page.getByLabel("Limite baixo de X1").fill("1");
  await page.getByLabel("Limite alto de X1").fill("1,0000000000000002");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const notice = page.getByText(
    "A faixa de X1 não permite representar os níveis solicitados da malha.",
  );
  await expect(notice).toBeVisible();
  await expect(page.getByTestId("optimal-result")).toHaveCount(0);
  await notice.screenshot({ path: info.outputPath("faixa-sem-resolucao.png") });
});

test("ótimo I: cancelar a busca real e reiniciar com outros inícios", async ({ page }, info) => {
  await page.addInitScript(() => {
    const counts = { posted: 0, terminated: 0 };
    Object.assign(window, { optimalWorkerEvents: counts });
    const activeSearches = new WeakSet<Worker>();
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const data = (message as { requestJson?: string }).requestJson;
      if (data && JSON.parse(data).operation.type === "designOptimalGenerate") {
        counts.posted++;
        activeSearches.add(this);
      }
      return Reflect.apply(post, this, [message, ...args]);
    };
    const terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      if (activeSearches.has(this)) counts.terminated++;
      return terminate.call(this);
    };
  });
  const events = () =>
    page.evaluate(
      () =>
        (window as unknown as { optimalWorkerEvents: { posted: number; terminated: number } })
          .optimalWorkerEvents,
    );
  await beginFourFactorSearch(page, 8);
  const panel = page.getByTestId("optimal-panel");
  const search = panel.getByRole("button", { name: "Buscar planejamento", exact: true });
  const started = performance.now();
  await search.click();
  const cancel = panel.getByRole("button", { name: "Cancelar", exact: true });
  await expect(cancel).toBeVisible();
  const feedbackMs = performance.now() - started;
  await expect.poll(async () => (await events()).posted).toBe(1);
  const cancelStarted = performance.now();
  await cancel.click();
  const notice = panel.getByText("Busca cancelada.", { exact: true });
  await expect(notice).toBeVisible();
  const cancellationMs = performance.now() - cancelStarted;
  await expect.poll(async () => (await events()).terminated).toBe(1);
  await expect(panel.getByTestId("optimal-result")).toHaveCount(0);
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("1");
  await search.click();
  await expect(panel.getByTestId("optimal-table").locator("tbody tr")).toHaveCount(60);
  await expect.poll(async () => (await events()).posted).toBe(2);
  const timingPath = info.outputPath("optimal-cancellation-timings.json");
  writeFileSync(timingPath, JSON.stringify({ feedbackMs, cancellationMs, ...(await events()) }));
  await info.attach("optimal-cancellation-timings", {
    contentType: "application/json",
    path: timingPath,
  });
  await expect(notice).toHaveCount(0);
});

for (const criterion of ["d", "i"]) {
  test(`ótimo saturado ${criterion}: troca válida com n=p e semente 2`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await startObjective(page, "plan");
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).first().fill("Temperatura");
    await page.getByLabel("Tipo").first().selectOption("numeric");
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(1).fill("Atividade");
    await page.getByRole("button", { name: "Avançar", exact: true }).click();
    await page
      .getByTestId("design-mode")
      .getByRole("radio", { name: /Ótimo D\/I/ })
      .check();
    await page.getByLabel("Limite baixo de Temperatura").fill("-1");
    await page.getByLabel("Limite alto de Temperatura").fill("1");
    await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption("linear");
    await page.getByRole("combobox", { name: "Critério", exact: true }).selectOption(criterion);
    await page.getByLabel("Total de ensaios", { exact: true }).fill("2");
    await page.getByLabel("Inícios aleatórios", { exact: true }).fill("1");
    await page
      .getByLabel("Aleatorizar a ordem de execução dos ensaios novos", { exact: true })
      .uncheck();
    await page.getByLabel("Semente da aleatorização", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
    const table = page.getByTestId("optimal-table");
    await expect(table.locator("tbody tr")).toHaveCount(2);
    const values = await table
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) => Number(row.querySelectorAll("td")[1]?.textContent?.replace(",", "."))),
      );
    expect(values.sort((a, b) => a - b)).toEqual([-1, 1]);
    await expect(page.getByTestId("optimal-metrics")).toContainText("1,3863");
    const result = page.getByTestId("optimal-result");
    await expect(page.getByTestId("optimal-stop")).toContainText("sem troca que melhore");
    const details = page.getByTestId("optimal-search-details");
    await details.locator("summary").click();
    await expect(details).toContainText(
      "Inícios tentados (1), com resultado (1), sem resultado (0)",
    );
    for (const theme of THEME_LIST) {
      await page.locator("header.app-header select").nth(1).selectOption(theme);
      for (const language of ["pt-BR", "en"]) {
        await page.locator("header.app-header select").first().selectOption(language);
        await page.evaluate(() => document.fonts.ready);
        for (const width of [375, 1064]) {
          await page.setViewportSize({ width, height: 892 });
          for (const scale of [1, 2]) {
            await page.evaluate((scale) => {
              document.documentElement.style.fontSize = `${16 * scale}px`;
            }, scale);
            const geometry = await page.evaluate(() => ({
              viewport: innerWidth,
              content: document.documentElement.scrollWidth,
              overflow: [...document.querySelectorAll("body *")]
                .filter(
                  (element) =>
                    element.checkVisibility() &&
                    element.getBoundingClientRect().right > innerWidth + 1,
                )
                .slice(0, 15)
                .map((element) => ({
                  tag: element.tagName,
                  classes: element.className,
                  text: element.textContent?.slice(0, 70),
                  right: element.getBoundingClientRect().right,
                })),
            }));
            expect(
              geometry.content,
              JSON.stringify({ theme, language, width, scale, geometry }),
            ).toBeLessThanOrEqual(width + 1);
          }
        }
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "16px";
        });
        const heights = await page
          .getByTestId("optimal-panel")
          .locator('input[type="number"]')
          .evaluateAll((inputs) => inputs.map((input) => input.getBoundingClientRect().height));
        expect(heights.every((height) => height >= 40)).toBe(true);
        await result.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath(`${criterion}-${theme}-${language}.png`) });
        expect(
          (await new AxeBuilder({ page }).include('[data-testid="optimal-panel"]').analyze())
            .violations,
        ).toEqual([]);
      }
    }
    await page.locator("header.app-header select").first().selectOption("pt-BR");
    await result.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`saturated-${criterion}.png`), fullPage: true });
    expect(
      (await new AxeBuilder({ page }).include('[data-testid="optimal-result"]').analyze())
        .violations,
    ).toEqual([]);
    await page
      .getByRole("button", { name: "Usar este planejamento nos dados", exact: true })
      .click();
    await expect(page.getByLabel("Temperatura — Obs. 1", { exact: true })).not.toHaveValue("");
    await expect(page.getByLabel("Temperatura — Obs. 2", { exact: true })).not.toHaveValue("");
  });
}
