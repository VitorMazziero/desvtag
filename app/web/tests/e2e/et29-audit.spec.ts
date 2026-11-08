import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { openFigureMenu } from "./figureTools";
import { openPowerTool } from "./menus";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

const example = (name: string) =>
  fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url));
test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] }, acceptDownloads: true });
async function open(page: Page, name: string) {
  await page.goto("/");
  const pick = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await pick).setFiles(example(name));
}
async function planning(page: Page) {
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [i, name] of ["Temperatura", "pH"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await expect(page.getByLabel("Tipo", { exact: true }).nth(i)).toHaveValue("numeric");
  }
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByTestId("variables-blocks-next").click();
  await page.getByTestId("data-blocks-next").click();
  for (const [name, low, high] of [
    ["Temperatura", "20", "40"],
    ["pH", "5", "7"],
  ]) {
    await page.getByLabel(`${name} — Nível baixo`).fill(low!);
    await page.getByLabel(`${name} — Nível alto`).fill(high!);
  }
}
test("T16/T18/T19: percurso único, retorno ao bloco, coleta protegida e foco no erro", async ({
  page,
}) => {
  await planning(page);
  await page.getByTestId("data-blocks-next").click();
  await page.locator(".steps .step").nth(1).click();
  await page.locator(".steps .step").nth(2).click();
  await expect(page.getByText("Triagem de fatores (dois níveis)", { exact: true })).toBeVisible();
  await expect(page.locator(".guided-actions:visible")).toHaveCount(1);
  await page.getByTestId("data-blocks-next").click();
  await page.getByRole("button", { name: "Gerar planejamento", exact: true }).click();
  await expect(page.getByTestId("run-matrix")).toBeVisible();
  await page.getByRole("button", { name: "Preencher respostas na grade →" }).click();
  const condition = page.getByLabel("Temperatura — Obs. 1", { exact: true });
  await expect(condition).toHaveAttribute("readonly", "");
  await page.getByLabel("Atividade — Obs. 1", { exact: true }).fill("abc");
  await page.getByRole("button", { name: /Ir à linha 1, Atividade/ }).click();
  await expect(page.getByLabel("Atividade — Obs. 1", { exact: true })).toBeFocused();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Editar condições…" }).click();
  await expect(condition).not.toHaveAttribute("readonly");
  await condition.fill("25");
  await page.getByRole("button", { name: "Proteger condições" }).click();
  await expect(condition).toHaveValue("25");
});
test("T19: arquivo inicia o cadastro sem resposta provisória e mapeia unidade", async ({
  page,
}) => {
  await page.goto("/");
  await startObjective(page, "analyze");
  const pick = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Importar arquivo (CSV ou XLSX)…" }).click();
  await (await pick).setFiles({
    name: "medidas.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Unidade;Tempo;Biomassa\nU1;Antes;10\nU1;Depois;12\nU2;Antes;11\nU2;Depois;13\n",
    ),
  });
  await page.getByLabel("Papel 1", { exact: true }).selectOption("unit");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.getByTestId("variables-blocks-next").click();
  await expect(page.getByLabel("Nome", { exact: true }).last()).toHaveValue("Biomassa");
});
test("T17: salvar e reabrir preserva o experimento ativo", async ({ page }) => {
  await open(page, "04-otimizacao-e-confirmacao");
  await page.getByLabel("Experimento ativo").selectOption("e2");
  await expect(page.getByTestId("confirmation-check")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = await (await download).path();
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(file!);
  await expect(page.getByLabel("Experimento ativo")).toHaveValue("e2");
  await expect(page.getByTestId("confirmation-check")).toBeVisible();
});
for (const width of [1920, 1200, 800, 375])
  test(`T22: ${width}px sem transbordamento, modal com rolagem isolada`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("objective-start")).toBeVisible();
    if (width <= 800) {
      await expect(page.getByLabel("Etapa do experimento")).toBeVisible();
      await expect(page.getByLabel("Experimento ativo")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await openPowerTool(page);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
    await page.screenshot({ path: info.outputPath(`et29-${width}.png`), fullPage: true });
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });
for (const theme of THEME_LIST)
  test(`T12: axe no aviso de potência desatualizada e campo inválido / ${theme}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await page.goto("/");
    await openPowerTool(page);
    await page.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByTestId("power-result")).toBeVisible();
    await openPowerTool(page);
    await page.getByLabel("Nível de significância (α)", { exact: true }).fill("2");
    await expect(page.getByTestId("power-stale")).toBeVisible();
    await page.getByRole("button", { name: "Calcular", exact: true }).click();
    await expect(page.getByLabel("Nível de significância (α)", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

test("T20: contraste por nível valida a soma antes de adicionar", async ({ page }) => {
  await page.goto("/");
  await startObjective(page, "compare");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Tratamento");
  await page.getByLabel("Níveis (opcional)").fill("A; B; C");
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).last().fill("Atividade");
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  await page.getByLabel("Tratamento — Obs. 1", { exact: true }).evaluate((el) => {
    const event = new Event("paste", { bubbles: true, cancelable: true });
    const data = new DataTransfer();
    data.setData("text/plain", "A\t1\nA\t2\nB\t3\nB\t4\nC\t5\nC\t6");
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  });
  await page.getByTestId("data-blocks-next").click();
  await page.getByTestId("analysis-blocks-next").click();
  await page.getByRole("radio", { name: /Vários fatores/ }).check();
  await page.getByTestId("analysis-contrasts-analysis-contrasts").click();
  await page.getByLabel("Nome do contraste").fill("A versus B/C");
  await page.getByLabel("Peso de A").fill("1");
  await page.getByLabel("Peso de B").fill("-0,5");
  await page.getByLabel("Peso de C").fill("0,5");
  await page.getByRole("button", { name: "Adicionar contraste", exact: true }).click();
  await expect(page.locator(".error").filter({ hasText: /pesos/ })).toBeVisible();
  await page.getByLabel("Peso de C").fill("-0,5");
  await expect(page.getByTestId("contrast-expression")).toContainText("A − média(B, C)");
  await page.getByRole("button", { name: "Adicionar contraste", exact: true }).click();
  await expect(page.locator(".facts-list").filter({ hasText: "A versus B/C" })).toBeVisible();
});

for (const [name, id] of [
  ["02-triagem-meio-cultivo", "pareto-chart"],
  ["01-enzimas-quatro-condicoes", "qq-chart"],
])
  test(`T15: ${id} cabe a 1,2 e exporta PNG/PDF`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
    await open(page, name!);
    const figure = page.getByTestId(id!);
    await expect(figure).toBeVisible();
    await openFigureMenu(figure);
    await figure.getByTestId("figure-customizer").locator("summary").click();
    await figure.getByLabel("Tamanho da fonte desta figura", { exact: true }).selectOption("1.2");
    const overflow = await figure.locator(".chart-canvas svg").evaluate((svg) => {
      const root = svg as SVGSVGElement;
      const bounds = root.viewBox.baseVal;
      return [...root.querySelectorAll('text[data-figure="legend"],text[data-figure="title"]')]
        .map((e) => {
          const box = (e as SVGGraphicsElement).getBBox();
          const point = root.createSVGPoint();
          point.x = box.x + box.width;
          point.y = box.y + box.height;
          const transformed = point.matrixTransform((e as SVGGraphicsElement).getScreenCTM()!);
          const local = transformed.matrixTransform(root.getScreenCTM()!.inverse());
          return {
            text: e.textContent,
            x: local.x,
            y: local.y,
            width: bounds.width,
            height: bounds.height,
          };
        })
        .filter((b) => b.x > b.width + 1 || b.y > b.height + 1);
    });
    expect(overflow).toEqual([]);
    if (id === "pareto-chart")
      expect(
        await figure.locator(".chart-canvas svg").evaluate((svg) => {
          const left = Number(svg.getAttribute("data-plot")!.split(" ")[0]);
          return [...svg.querySelectorAll('text[text-anchor="end"]')].every((node) => {
            const box = (node as SVGGraphicsElement).getBBox();
            return box.x + box.width < left;
          });
        }),
      ).toBe(true);

    await openFigureMenu(figure);

    await figure.getByTestId("figure-customizer").locator("summary").click();
    await figure.locator(".chart-canvas").screenshot({ path: info.outputPath(`et29-${id}.png`) });
    for (const format of ["PNG", "PDF"]) {
      const download = page.waitForEvent("download");
      await openFigureMenu(figure);
      await figure.getByRole("button", { name: `Figura — ${format}`, exact: true }).click();
      await (await download).saveAs(info.outputPath(`et29-${id}.${format.toLowerCase()}`));
    }
  });
