import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { THEME_LIST } from "./themes";

// ET29: percurso guiado por blocos (Anterior/Seguir, opções dependentes só depois da escolha,
// «Mostrar tudo»), tela inicial com o «Avançar» junto das opções, menus e área do arquivo.

// Parte do armazenamento vazio: o padrão do aplicativo é o percurso guiado.
test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });

async function startPlanning(page: Page) {
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  for (const [i, name] of ["Temperatura", "pH"].entries()) {
    await page.getByRole("button", { name: "Adicionar fator" }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByTestId("variables-blocks-next").click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(2).fill("Atividade");
  await page.getByRole("button", { name: "Avançar" }).click();
}

test("tela inicial: o «Avançar» fica junto das três opções e «Abrir projeto» separado", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.locator(".home-start");
  const next = start.getByRole("button", { name: "Avançar" });
  await expect(next).toBeDisabled();
  await expect(start.getByRole("radio")).toHaveCount(3);
  await expect(
    page.locator(".home-recent").getByRole("button", { name: "Abrir projeto" }),
  ).toBeVisible();
  // Só existe um «Avançar» na tela inicial.
  await expect(page.getByRole("button", { name: "Avançar" })).toHaveCount(1);
  await page.getByRole("radio", { name: /Analisar dados existentes/ }).check();
  await expect(next).toBeEnabled();
});

test("planejamento em blocos: níveis → objetivo e opções → geração; as opções só aparecem depois dos níveis", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startPlanning(page);
  const blocks = page.getByTestId("twolevel-blocks");
  // Bloco 1: níveis. O seguinte está bloqueado até os níveis serem válidos.
  await expect(blocks).toHaveAttribute("data-mode", "guided");
  await expect(page.getByLabel("Temperatura — Nível baixo")).toBeVisible();
  await expect(page.getByText("Triagem de fatores (dois níveis)")).toBeHidden();
  await expect(page.getByTestId("twolevel-blocks-next")).toBeDisabled();
  await expect(page.getByTestId("twolevel-blocks-goal")).toBeDisabled();

  await page.getByLabel("Temperatura — Nível baixo").fill("20");
  await page.getByLabel("Temperatura — Nível alto").fill("40");
  await page.getByLabel("pH — Nível baixo").fill("5");
  await page.getByLabel("pH — Nível alto").fill("7");
  await expect(page.getByTestId("twolevel-blocks-next")).toBeEnabled();
  await page.getByTestId("twolevel-blocks-next").click();

  // Bloco 2: objetivo e opções (as opções de planejamento já refletem os 2 fatores).
  await expect(page.getByText("Triagem de fatores (dois níveis)")).toBeVisible();
  await expect(page.getByText(/Fatorial completo — 4 ensaios/)).toBeVisible();
  await expect(page.getByLabel("Temperatura — Nível baixo")).toBeHidden();
  await page.getByTestId("twolevel-blocks-next").click();

  // Bloco 3: repetições e geração; ao gerar, a matriz abre sozinha (bloco 4).
  await page.getByLabel("Pontos centrais").fill("2");
  await page.getByRole("button", { name: "Gerar planejamento" }).click();
  await expect(page.getByTestId("run-matrix")).toBeVisible();
  await expect(page.getByTestId("twolevel-blocks")).toContainText("Matriz de ensaios");
  // Voltar aos níveis preserva o que foi digitado (os blocos não são desmontados).
  await page.getByTestId("twolevel-blocks-levels").click();
  await expect(page.getByLabel("Temperatura — Nível alto")).toHaveValue("40");
});

test("«Mostrar tudo» exibe todos os blocos e a preferência é lembrada", async ({ page }) => {
  await startPlanning(page);
  await expect(page.getByText("Triagem de fatores (dois níveis)")).toBeHidden();
  await page.getByTestId("show-all-blocks").check();
  await expect(page.getByTestId("twolevel-blocks")).toHaveAttribute("data-mode", "all");
  await expect(page.getByText("Triagem de fatores (dois níveis)")).toBeVisible();
  await expect(page.getByLabel("Temperatura — Nível baixo")).toBeVisible();
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("optima.showAllSections"))).toBe("1");
});

test("teclado: Tab alcança Anterior e Seguir e Enter troca de bloco", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByTestId("variables-blocks-next").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("variables-blocks-responses")).toHaveAttribute(
    "aria-current",
    "step",
  );
  await page.getByTestId("variables-blocks-prev").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("variables-blocks-factors")).toHaveAttribute(
    "aria-current",
    "step",
  );
});

test("menus: Extras abre a calculadora de potência; «Sobre e atualizações» traz versões e motor", async ({
  page,
}) => {
  await page.goto("/");
  // Fora do fluxo: nada de histórico, motor ou calculadora soltos na página.
  await expect(page.locator("main").getByTestId("power-calculator")).toHaveCount(0);
  await page.getByTestId("extras-menu").locator(":scope > summary").click();
  await page.getByTestId("open-power").click();
  await expect(page.getByTestId("power-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("power-dialog")).toBeHidden();
  await page.getByTestId("about-menu").locator(":scope > summary").click();
  await page.locator(".engine-status > summary").click();
  await expect(page.getByTestId("engine-version")).toBeVisible();
  await expect(page.getByTestId("update-check")).toHaveCount(0); // só no aplicativo Windows
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("engine-version")).toBeHidden();
});

test("área do arquivo: uma linha com nome, ações e um único indicador de estado", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/");
  const bar = page.locator(".file-bar");
  await expect(bar.getByRole("button", { name: "Novo projeto" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Abrir…" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "Salvar", exact: true })).toBeVisible();
  const heights = await bar
    .locator("input:visible, button:visible, summary:visible")
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(24); // tudo na mesma linha
  await expect(page.getByTestId("save-details")).toContainText("Sem alterações pendentes");
  await page.getByLabel("Nome do projeto").fill("Outro nome");
  await expect(page.getByTestId("save-details")).toContainText("Alterações não salvas");
});

for (const theme of THEME_LIST) {
  test(`axe: percurso guiado e menus no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("optima.theme", t), theme);
    await startPlanning(page);
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations, `${theme}/${label}`).toEqual([]);
    };
    await scan("bloco 1");
    await page.getByLabel("Temperatura — Nível baixo").fill("20");
    await page.getByLabel("Temperatura — Nível alto").fill("40");
    await page.getByLabel("pH — Nível baixo").fill("5");
    await page.getByLabel("pH — Nível alto").fill("7");
    await page.getByTestId("twolevel-blocks-next").click();
    await scan("bloco 2");
    await page.getByTestId("file-menu").locator(":scope > summary").click();
    await scan("menu do arquivo");
  });
}
