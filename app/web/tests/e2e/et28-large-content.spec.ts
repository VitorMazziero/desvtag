import { expect, type Page, test } from "@playwright/test";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

// ET28 T05 / AU-U09: navegação, grade e resultados com conteúdo grande (milhares de linhas, muitas
// colunas) nos seis temas, com a barra lateral aberta e recolhida. Rolagem horizontal só na tabela.

test.use({ locale: "pt-BR", storageState: { cookies: [], origins: [] } });

async function paste(page: Page, label: string, text: string) {
  // Seletor CSS: `getByLabel` calcula o nome acessível de cada campo e custa minutos com ~14 mil campos.
  await page.locator(`[aria-label="${label}"]`).evaluate((el, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    el.dispatchEvent(event);
  }, text);
}

const NL = String.fromCharCode(10);

/** Projeto de comparação com `rows` linhas e `responses` respostas, criado pelo percurso normal. */
async function bigProject(page: Page, rows: number, responses: number) {
  await page.goto("/");
  await startObjective(page, "compare");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByLabel("Níveis (opcional)").fill("n1; n2; n3; n4; n5; n6; n7; n8");
  await page.getByRole("button", { name: "Respostas", exact: true }).click();
  for (let r = 0; r < responses; r++) {
    await page.getByRole("button", { name: "Adicionar resposta" }).click();
    await page
      .getByLabel("Nome", { exact: true })
      .last()
      .fill(`Resposta ${r + 1}`);
  }
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Adicionar linha" }).click();
  const levels = Array.from({ length: rows }, (_, i) => `n${(i % 8) + 1}`).join(NL);
  await paste(page, "Condição — Obs. 1", levels);
  for (let r = 0; r < responses; r++) {
    const values = Array.from({ length: rows }, (_, i) =>
      String(10 + r + ((i * 7 + r * 3) % 13) / 4 + (i % 8) * 0.5).replace(".", ","),
    ).join(NL);
    await paste(page, `Resposta ${r + 1} — Obs. 1`, values);
  }
}

/**
 * Troca o tema como o seletor faz, dentro da página. `selectOption` do Playwright força layout
 * repetidas vezes em páginas com milhares de campos (28–70 s medidos) e não mede o aplicativo, que
 * troca o tema em ~1–2 s com 4.000 campos.
 */
async function setTheme(page: Page, theme: string): Promise<number> {
  return page.evaluate(async (value) => {
    const select = document.querySelectorAll("header.app-header select")[1] as HTMLSelectElement;
    const started = performance.now();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return performance.now() - started;
  }, theme);
}

const SIZE = { width: 1064, height: 892 };

/** Folgas e alinhamentos que o usuário comentou (ET29), medidos no estado atual da tela. */
async function spacing(page: Page) {
  return page.evaluate(() => {
    const select = document.querySelector(".experiment-bar select")?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll(".experiment-action")].map((e) =>
      e.getBoundingClientRect(),
    );
    const collapse = document.querySelector(".collapse-stages")?.getBoundingClientRect();
    const steps = document.querySelector(".steps")?.getBoundingClientRect();
    return {
      pageOverflow: document.documentElement.scrollWidth - innerWidth,
      centers: select
        ? buttons.map((b) => Math.abs(b.top + b.height / 2 - (select.top + select.height / 2)))
        : [],
      collapseGap: collapse && steps ? steps.top - collapse.bottom : null,
    };
  });
}

test("2.000 linhas: cabeçalho fixo, ações e barra lateral nos seis temas", async ({
  page,
}, info) => {
  test.setTimeout(1_800_000);
  await page.setViewportSize(SIZE);
  await bigProject(page, 2000, 6);
  for (const theme of THEME_LIST) {
    const switched = await setTheme(page, theme);
    expect(switched, `${theme}: troca de tema com 4.000 campos`).toBeLessThan(10_000);
    for (const collapsed of [false, true]) {
      const toggle = page.locator(".collapse-stages");
      const isCollapsed = (await toggle.getAttribute("aria-expanded")) === "false";
      // Clique dentro da página: a verificação de acionabilidade do Playwright custa minutos no
      // Firefox com milhares de campos e não mede o aplicativo.
      if (isCollapsed !== collapsed) await toggle.evaluate((el) => (el as HTMLElement).click());
      const label = `${theme}/${collapsed ? "recolhida" : "aberta"}`;
      const wrap = page.locator(".data-entry > .grid-scroll");
      await wrap.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const m = await page.evaluate(() => {
        const wrapper = document.querySelector(".data-entry > .grid-scroll") as HTMLElement;
        const box = wrapper.getBoundingClientRect();
        const th = wrapper.querySelector("thead th")?.getBoundingClientRect();
        const action = [...wrapper.querySelectorAll(".row-menu-button")]
          .pop()
          ?.getBoundingClientRect();
        const body = document.querySelector(".step-body")?.getBoundingClientRect();
        return {
          headerOffset: th ? th.top - box.top : null,
          actionInside: action
            ? action.top >= box.top - 1 && action.bottom <= box.bottom + 1
            : false,
          actionSize: action ? [action.width, action.height] : null,
          wrapperHeight: box.height,
          viewport: innerHeight,
          widthRatio: body ? box.width / body.width : 0,
          scrollable: wrapper.scrollHeight > wrapper.clientHeight,
        };
      });
      expect(m.scrollable, label).toBe(true);
      expect(m.headerOffset ?? 999, `${label} cabeçalho fixo`).toBeLessThanOrEqual(2);
      expect(m.headerOffset ?? -999, label).toBeGreaterThanOrEqual(-2);
      expect(m.actionInside, `${label} ação da última linha visível`).toBe(true);
      expect(
        m.actionSize?.every((v) => v <= 44),
        label,
      ).toBe(true);
      expect(m.wrapperHeight, label).toBeLessThanOrEqual(m.viewport);
      expect(m.widthRatio, label).toBeGreaterThan(0.9);
      const gaps = await spacing(page);
      expect(gaps.pageOverflow, `${label} rolagem horizontal da página`).toBeLessThanOrEqual(1);
      expect(
        gaps.centers.every((v) => v <= 2),
        `${label} botões do experimento alinhados`,
      ).toBe(true);
      if (!collapsed) expect(gaps.collapseGap ?? 99, label).toBeGreaterThanOrEqual(12);
    }
    await page.screenshot({ path: info.outputPath(`grade-${theme}.png`) });
  }
});

test("resultados longos de 2.000 linhas ficam contidos nos seis temas", async ({ page }, info) => {
  test.setTimeout(900_000);
  await page.setViewportSize(SIZE);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "1"));
  await bigProject(page, 2000, 2);
  await page.getByRole("button", { name: "Avançar" }).click();
  await page.getByRole("button", { name: "Comparar tratamentos", exact: true }).click();
  await expect(page.getByTestId("pair-table")).toBeVisible({ timeout: 180_000 });
  for (const theme of THEME_LIST) {
    const switched = await setTheme(page, theme);
    expect(switched, `${theme}: troca de tema com 4.000 campos`).toBeLessThan(10_000);
    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - innerWidth,
      loose: [...document.querySelectorAll(".results-table")].filter(
        (t) => t.getBoundingClientRect().right > innerWidth + 1 && !t.closest(".grid-scroll"),
      ).length,
    }));
    expect(overflow.page, `${theme}: página sem rolagem horizontal`).toBeLessThanOrEqual(1);
    expect(overflow.loose, `${theme}: tabela fora de quadro rolável`).toBe(0);
    await page.screenshot({ path: info.outputPath(`resultados-${theme}.png`) });
  }
});

test("projeto vazio: espaços e alinhamentos nos seis temas, barra aberta/recolhida e todos os blocos", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SIZE);
  await page.goto("/");
  await startObjective(page, "compare");
  for (const theme of THEME_LIST) {
    await setTheme(page, theme);
    for (const showAll of [false, true]) {
      await page.evaluate((value) => {
        localStorage.setItem("optima.showAllSections", value ? "1" : "0");
      }, showAll);
      for (const collapsed of [false, true]) {
        const toggle = page.locator(".collapse-stages");
        const isCollapsed = (await toggle.getAttribute("aria-expanded")) === "false";
        if (isCollapsed !== collapsed) await toggle.click();
        const label = `${theme}/${showAll ? "todos" : "guiado"}/${collapsed ? "recolhida" : "aberta"}`;
        const gaps = await spacing(page);
        expect(gaps.pageOverflow, `${label} rolagem horizontal da página`).toBeLessThanOrEqual(1);
        expect(gaps.centers.length, label).toBeGreaterThan(0);
        expect(
          gaps.centers.every((v) => v <= 2),
          `${label} botões do experimento alinhados`,
        ).toBe(true);
        if (!collapsed) expect(gaps.collapseGap ?? 99, label).toBeGreaterThanOrEqual(12);
      }
    }
    await page.screenshot({ path: info.outputPath(`vazio-${theme}.png`) });
  }
});

test("importação de arquivo com 3.000 linhas e 10 colunas: pré-visualização contida e navegável", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SIZE);
  await page.goto("/");
  await startObjective(page, "compare");
  await page.getByRole("button", { name: "Adicionar fator" }).click();
  await page.getByLabel("Nome", { exact: true }).nth(0).fill("Condição");
  await page.getByRole("button", { name: "Respostas", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar resposta" }).click();
  await page.getByLabel("Nome", { exact: true }).last().fill("Resposta 1");
  await page.getByRole("button", { name: "Avançar" }).click();
  const header = ["Condição", ...Array.from({ length: 9 }, (_, i) => `Resposta ${i + 1}`)];
  const lines = [header.join(";")];
  for (let r = 0; r < 3000; r++)
    lines.push(
      [
        `n${(r % 6) + 1}`,
        ...header
          .slice(1)
          .map((_, c) => (10 + ((r * 7 + c) % 13) / 4).toFixed(2).replace(".", ",")),
      ].join(";"),
    );
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Importar arquivo/ }).click();
  await (await chooser).setFiles({
    name: "grande.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(lines.join(NL), "utf8"),
  });
  const wizard = page.getByTestId("import-wizard");
  await expect(wizard).toBeVisible({ timeout: 120_000 });
  for (const theme of THEME_LIST) {
    await setTheme(page, theme);
    const m = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="import-wizard"]') as HTMLElement;
      const box = modal.getBoundingClientRect();
      const tables = [...modal.querySelectorAll(".grid-scroll")].map((e) => {
        const r = e.getBoundingClientRect();
        return {
          right: r.right,
          scrollable: e.scrollWidth > e.clientWidth,
          overflowX: getComputedStyle(e).overflowX,
        };
      });
      const offenders = [...document.querySelectorAll("body *")]
        .filter(
          (e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".grid-scroll"),
        )
        .slice(0, 6)
        .map(
          (e) =>
            `${e.tagName}.${(e.className as string).toString().slice(0, 40)} ${Math.round(e.getBoundingClientRect().right)}`,
        );
      return {
        offenders,
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        modalInside: box.left >= -1 && box.right <= innerWidth + 1,
        tables,
        viewport: innerWidth,
      };
    });
    expect(m.pageOverflow, `${theme}: página; ${m.offenders.join(" | ")}`).toBeLessThanOrEqual(1);
    expect(m.modalInside, `${theme}: assistente dentro da largura da tela`).toBe(true);
    expect(m.tables.length, `${theme}: pré-visualização em quadro rolável`).toBeGreaterThan(0);
    expect(
      m.tables.every((t) => t.right <= m.viewport + 1 && ["auto", "scroll"].includes(t.overflowX)),
      theme,
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`importacao-${theme}.png`) });
  }
});

test("40 colunas de resposta: rolagem horizontal só na tabela, em 1064, 800 e 375 px", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await page.setViewportSize(SIZE);
  await bigProject(page, 40, 40);
  for (const width of [1064, 800, 375]) {
    await page.setViewportSize({ width, height: 892 });
    const m = await page.evaluate(() => {
      const wrapper = document.querySelector(".data-entry > .grid-scroll") as HTMLElement;
      wrapper.scrollLeft = wrapper.scrollWidth;
      const box = wrapper.getBoundingClientRect();
      const first = wrapper.querySelector("thead th:first-child")?.getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        wrapperOverflowX: getComputedStyle(wrapper).overflowX,
        scrollable: wrapper.scrollWidth > wrapper.clientWidth,
        wrapperRight: box.right,
        stickyFirstOffset: first ? first.left - box.left : null,
        viewport: innerWidth,
      };
    });
    expect(m.pageOverflow, `${width}: página sem rolagem horizontal`).toBeLessThanOrEqual(1);
    expect(m.scrollable, `${width}: tabela rola`).toBe(true);
    expect(["auto", "scroll"]).toContain(m.wrapperOverflowX);
    expect(m.wrapperRight, `${width}: tabela dentro da janela`).toBeLessThanOrEqual(m.viewport + 1);
    expect(Math.abs(m.stickyFirstOffset ?? 999), `${width}: coluna Obs. fixa`).toBeLessThanOrEqual(
      2,
    );
    await page.screenshot({ path: info.outputPath(`colunas-${width}.png`) });
  }
});

test("barra do projeto: o nome não é espremido em uma coluna estreita em 1064, 800 e 375 px", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".file-row > .field.grow")).toBeVisible();
  for (const width of [1064, 800, 375]) {
    await page.setViewportSize({ width, height: 892 });
    const m = await page.evaluate(() => {
      const field = document.querySelector(".file-row > .field.grow") as HTMLElement;
      const label = field.querySelector("span") as HTMLElement;
      const input = field.querySelector("input") as HTMLElement;
      return {
        inputWidth: input.getBoundingClientRect().width,
        labelLines: Math.round(
          label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight),
        ),
        fieldWidth: field.getBoundingClientRect().width,
      };
    });
    expect(m.labelLines, `${width}: rótulo em uma linha`).toBe(1);
    expect(m.inputWidth, `${width}: campo legível`).toBeGreaterThanOrEqual(180);
  }
});
