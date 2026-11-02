import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { showAllSections } from "./showAll";
import { THEME_LIST } from "./themes";

// Espaçamento e tamanho dos controles (ET21): mede os botões de cada tela principal, nos seis temas
// e em duas larguras, e a rolagem ao trocar de etapa.

test.use({ locale: "pt-BR" });

const here = dirname(fileURLToPath(import.meta.url));

const MIN_GAP = 12; // px entre botões vizinhos na mesma linha
const MIN_ROW_GAP = 8; // px entre linhas de botões
const MIN_HEIGHT = 36; // px (botão pequeno); os demais têm 40

interface Box {
  label: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  parent: number;
}

/** Caixas dos controles visíveis (botões, abas, etapas), agrupadas pelo contêiner. */
async function controls(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const parents = new Map<Element, number>();
    const out: Box[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("button, .button, .tab, .step")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
      const holder = el.closest("li")
        ? (el.closest("ol, ul") as Element)
        : (el.parentElement as Element);
      if (!parents.has(holder)) parents.set(holder, parents.size);
      out.push({
        label: (el.textContent ?? "").trim().slice(0, 30),
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        parent: parents.get(holder) ?? 0,
      });
    }
    return out;
  });
}

function problems(boxes: Box[]): string[] {
  const found: string[] = [];
  for (const a of boxes) {
    if (a.bottom - a.top < MIN_HEIGHT - 0.5)
      found.push(`${a.label}: altura ${(a.bottom - a.top).toFixed(1)} px`);
    for (const b of boxes) {
      if (a === b || a.parent !== b.parent) continue;
      const sameLine = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 4;
      if (sameLine && a.right <= b.left + 0.5) {
        const gap = b.left - a.right;
        if (gap < MIN_GAP - 0.5) found.push(`${a.label} → ${b.label}: ${gap.toFixed(1)} px`);
      }
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 4;
      if (overlapX && a.bottom <= b.top + 0.5) {
        const gap = b.top - a.bottom;
        if (gap < MIN_ROW_GAP - 0.5) found.push(`${a.label} ↓ ${b.label}: ${gap.toFixed(1)} px`);
      }
    }
  }
  return found;
}

async function screens(page: Page): Promise<void> {
  // Tela inicial.
  expect(problems(await controls(page))).toEqual([]);
  // Variáveis (etapa 2).
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  expect(problems(await controls(page))).toEqual([]);
}

for (const width of [1200, 375]) {
  test(`distância e altura dos botões, nos seis temas, em ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 800 });
    for (const theme of THEME_LIST) {
      await page.goto("/");
      await page.getByLabel("Tema").selectOption(theme);
      await screens(page);
    }
  });
}

test("ao avançar de etapa, a página volta ao topo e o foco vai ao título", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 500 });
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Avançar" }).click();
  await expect(page.getByRole("heading", { name: /Fatores e respostas|variáveis/i })).toBeVisible();
  // A rolagem é suave: aguarda chegar ao topo do fluxo.
  await expect
    .poll(async () => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeLessThan(before);
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe("H2");
});

test("com movimento reduzido a rolagem é imediata", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1200, height: 500 });
  await page.goto("/");
  await page.getByRole("radio", { name: /Planejar experimento/ }).check();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Avançar" }).click();
  await expect(page.locator("h2:focus")).toHaveCount(1);
  const top = await page.evaluate(
    () => document.querySelector(".workflow")?.getBoundingClientRect().top ?? 0,
  );
  expect(Math.abs(top)).toBeLessThan(2);
});

test("a tela inicial tem um único logotipo", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("img.group-logo")).toHaveCount(1);
});

for (const width of [1200, 375]) {
  test(`resultados e exportação do exemplo 01: botões espaçados em ${width} px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await showAllSections(page);
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Abrir…" }).click();
    await (await chooser).setFiles(
      resolve(here, "../../../../examples/01-enzimas-quatro-condicoes/projeto.enzitag"),
    );
    await expect(page.getByTestId("anova-table")).toBeVisible();
    expect(problems(await controls(page))).toEqual([]);
    // Etapa de dados (grade, importação).
    await page
      .getByRole("button", { name: /Planejamento e dados|Dados/ })
      .first()
      .click();
    expect(problems(await controls(page))).toEqual([]);
  });
}
