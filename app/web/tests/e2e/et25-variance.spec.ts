import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openFigureMenu } from "./figureTools";
import { startObjective } from "./startObjective";
import { THEME_LIST } from "./themes";

test.use({ locale: "pt-BR", viewport: { width: 1064, height: 892 }, acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as {
      scientificRequests: Array<{ type: string }>;
      varianceDelay: number;
      varianceResponses: number;
      varianceEvents: Array<{ stage: string; time: number; id: number; status?: string }>;
    };
    host.scientificRequests = [];
    host.varianceDelay = 0;
    host.varianceResponses = 0;
    host.varianceEvents = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const json = (message as { requestJson?: string }).requestJson;
      const operation = json ? JSON.parse(json).operation : null;
      if (operation) host.scientificRequests.push(operation);
      if (operation?.type === "designOptimalVariance") {
        const id = (message as { id: number }).id;
        host.varianceEvents.push({ stage: "queued", time: performance.now(), id });
        const listener = (
          event: MessageEvent<{ id: number; ok: boolean; responseJson?: string }>,
        ) => {
          if (event.data.id !== id) return;
          host.varianceResponses++;
          const status = event.data.responseJson
            ? JSON.parse(event.data.responseJson).outcome.status
            : "transportError";
          host.varianceEvents.push({ stage: "received", time: performance.now(), id, status });
          this.removeEventListener("message", listener);
        };
        this.addEventListener("message", listener);
        const send = () => {
          host.varianceEvents.push({ stage: "posted", time: performance.now(), id });
          Reflect.apply(original, this, [message, ...args]);
        };
        if (host.varianceDelay) {
          setTimeout(send, host.varianceDelay);
          return;
        }
        return send();
      }
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

test.afterEach(async ({ page }, info) => {
  if (!info.title.startsWith("blocos salvos")) return;
  const events = await page
    .evaluate(() => (window as unknown as { varianceEvents: unknown[] }).varianceEvents)
    .catch(() => []);
  const path = info.outputPath("variance-worker-events.json");
  writeFileSync(path, JSON.stringify(events, null, 2));
  await info.attach("variance-worker-events.json", { path, contentType: "application/json" });
});

async function begin(page: Page, names = ["X1", "X2"], model = "interactions", runs = 4) {
  await page.goto("/");
  await startObjective(page, "plan");
  for (const [i, name] of names.entries()) {
    await page.getByRole("button", { name: "Adicionar fator", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).nth(i).fill(name);
    await page.getByLabel("Tipo").nth(i).selectOption("numeric");
  }
  await page.getByRole("button", { name: "Adicionar resposta", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).nth(names.length).fill("Atividade");
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
  for (const name of names) {
    await page.getByLabel(`Limite baixo de ${name}`).fill("-1");
    await page.getByLabel(`Limite alto de ${name}`).fill("1");
  }
  await page.getByRole("combobox", { name: "Modelo", exact: true }).selectOption(model);
  await page.getByLabel("Total de ensaios", { exact: true }).fill(String(runs));
  await page.getByLabel("Inícios aleatórios", { exact: true }).fill("2");
  await page.getByLabel("Semente da aleatorização", { exact: true }).fill("17");
}

async function showOptimal(page: Page) {
  await page.locator(".steps .step").nth(2).click();
  await page
    .getByTestId("design-mode")
    .getByRole("radio", { name: /Ótimo D\/I/ })
    .check();
}
async function openArchive(page: Page, path: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(path);
  await showOptimal(page);
}
async function save(page: Page, path: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  await (await pending).saveAs(path);
  const json = unzipSync(new Uint8Array(readFileSync(path)))["project.json"];
  if (!json) throw new Error("project.json");
  return JSON.parse(strFromU8(json));
}
async function noAutomaticEvaluation(page: Page) {
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { scientificRequests: Array<{ type: string }> }
      ).scientificRequests.filter((r) =>
        ["designOptimalVariance", "designOptimalGenerate"].includes(r.type),
      ),
    ),
  ).toEqual([]);
}

test("perfil do zero: valores NumPy, arquivo sem novo cálculo, dados fonte e figuras", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await begin(page);
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const panel = page.getByTestId("optimal-variance-panel");
  await panel.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await expect(panel).toContainText("4 ensaios · 4 parâmetros · 9 candidatos");
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="optimal-variance-panel"]').analyze())
      .violations,
  ).toEqual([]);
  for (const theme of THEME_LIST) {
    await page.locator("header.app-header select").nth(1).selectOption(theme);
    for (const language of ["pt-BR", "en"]) {
      await page.locator("header.app-header select").first().selectOption(language);
      for (const width of [375, 1064]) {
        await page.setViewportSize({ width, height: 892 });
        for (const scale of [1, 2]) {
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${16 * scale}px`;
          }, scale);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${theme}/${language}/${width}/${scale}`,
          ).toBe(true);
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
      for (const id of ["optimal-variance-fds", "optimal-variance-spatial"]) {
        const figure = page.getByTestId(id);
        const outside = await figure.locator(".chart-canvas svg").evaluate((svg) => {
          const bounds = svg.getBoundingClientRect();
          return [...svg.querySelectorAll("text")]
            .filter((t) => {
              const r = t.getBoundingClientRect();
              return (
                r.left < bounds.left - 2 ||
                r.right > bounds.right + 2 ||
                r.top < bounds.top - 2 ||
                r.bottom > bounds.bottom + 2
              );
            })
            .map((t) => t.textContent);
        });
        expect(outside).toEqual([]);
        await figure.screenshot({ path: info.outputPath(`${id}-${theme}-${language}.png`) });
      }
    }
  }
  await page.locator("header.app-header select").first().selectOption("pt-BR");
  for (const extension of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: `Dados da variância (${extension})`, exact: true })
      .click();
    await (await pending).saveAs(info.outputPath(`variance-source.${extension.toLowerCase()}`));
  }
  const csv = readFileSync(info.outputPath("variance-source.csv"), "utf8");
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"));
  const separator = lines[0]?.includes(";") ? ";" : ",";
  const rows = lines
    .slice(1)
    .map((line) =>
      line.split(separator).map((value) => value.replace(/^"|"$/g, "").replace(",", ".")),
    );
  expect(rows).toHaveLength(9);
  const reference = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../../validation/cases/optimal_design/variance.json", import.meta.url),
      ),
      "utf8",
    ),
  ).cases[0];
  for (const row of rows) {
    const coded = row.slice(5, 7).map(Number);
    const point = reference.points.find((p: { coded: number[] }) =>
      p.coded.every((x, i) => x === coded[i]),
    );
    expect(point).toBeDefined();
    expect(Number(row[7])).toBeCloseTo(point.relative[0], 9);
    expect(Number(row[8])).toBeCloseTo(point.scaled[0], 9);
  }
  for (const id of ["optimal-variance-fds", "optimal-variance-spatial"]) {
    const figure = page.getByTestId(id);
    await openFigureMenu(figure);
    for (const extension of ["SVG", "PDF"]) {
      const pending = page.waitForEvent("download");
      await figure.getByRole("button", { name: new RegExp(`Figura — ${extension}`) }).click();
      await (await pending).saveAs(info.outputPath(`${id}.${extension.toLowerCase()}`));
    }
  }
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  const thread = page.getByTestId("comments-optimal-variance-fds");
  await thread.locator(":scope > summary").click();
  await thread
    .getByLabel("Novo comentário", { exact: true })
    .fill("A variância aumenta nos cantos do desenho.");
  await thread.getByRole("button", { name: "Comentar", exact: true }).click();
  const doc = await save(page, info.outputPath("variance.enzitag"));
  const exp = doc.experiments[0];
  expect(exp.optimalVariances).toHaveLength(1);
  expect(exp.optimalVariances[0].designId).toBe(exp.optimalDesigns[0].id);
  expect(exp.comments[0].target.analysisId).toBe(exp.optimalVariances[0].id);
  expect(exp.comments[0].revisionId).toBe(exp.optimalVariances[0].revisionId);
  expect(exp.optimalVariances[0].result.curves[0].average.scaled).toBeCloseTo(
    exp.optimalDesigns[0].result.metrics.iAverage,
    9,
  );
  await page.reload();
  await openArchive(page, info.outputPath("variance.enzitag"));
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await noAutomaticEvaluation(page);
});

test("quatro fatores com restrição: fatia vazia, eixos, paginação e perfil salvo", async ({
  page,
}, info) => {
  await begin(page, ["X1", "X2", "X3", "X4"], "linear", 12);
  await page.getByRole("button", { name: "Adicionar restrição", exact: true }).click();
  for (const name of ["X3", "X4"])
    await page.getByLabel(`Restrição 1: coeficiente de ${name}`, { exact: true }).fill("1");
  await page.getByLabel("Restrição 1: limite", { exact: true }).fill("-0.5");
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const panel = page.getByTestId("optimal-variance-panel");
  await panel.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await expect(panel).toContainText("27 candidatos espaciais");
  await expect(panel.getByRole("status")).toContainText("não contém candidatos admissíveis");
  await panel
    .getByRole("combobox", { name: "X3 fixado (codificado)", exact: true })
    .selectOption("-1");
  await panel
    .getByRole("combobox", { name: "X4 fixado (codificado)", exact: true })
    .selectOption("-1");
  await expect(page.getByTestId("optimal-variance-spatial")).toBeVisible();
  expect(
    await page.getByTestId("optimal-variance-spatial").locator("[data-chart-data] circle").count(),
  ).toBe(9);
  await page.getByText("Valores e dados fonte", { exact: true }).click();
  await expect(page.getByTestId("optimal-variance-table").locator("tbody tr")).toHaveCount(20);
  await panel.getByRole("button", { name: "Próxima página", exact: true }).click();
  await expect(page.getByTestId("optimal-variance-table").locator("tbody tr")).toHaveCount(7);
  await panel
    .getByRole("combobox", { name: "Escala da variância", exact: true })
    .selectOption("relative");
  await panel.screenshot({ path: info.outputPath("four-factor-slice.png") });
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const scroll = panel.getByRole("region", { name: "Valores e dados fonte", exact: true });
  expect(await scroll.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await scroll.focus();
  await scroll.press("ArrowRight");
  await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await panel.screenshot({ path: info.outputPath("four-factor-mobile-source.png") });
  await page.setViewportSize({ width: 1064, height: 892 });
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  const doc = await save(page, info.outputPath("four-factor-variance.enzitag"));
  expect(doc.experiments[0].optimalVariances[0].result.points).toHaveLength(27);
  expect(doc.experiments[0].optimalVariances[0].view).toMatchObject({
    scaled: false,
    fixed: { 2: -1, 3: -1 },
  });
});

test("seleciona planejamentos e perfis arquivados e reabre a visualização sem calcular", async ({
  page,
}, info) => {
  await begin(page);
  const panel = page.getByTestId("optimal-variance-panel");
  const search = page.getByRole("button", { name: "Buscar planejamento", exact: true });
  const apply = page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true });
  const scale = panel.getByRole("combobox", { name: "Escala da variância", exact: true });
  await search.click();
  await panel.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  await scale.selectOption("relative");
  await panel
    .getByRole("combobox", { name: "Fator do eixo horizontal", exact: true })
    .selectOption("1");
  await apply.click();
  await panel.getByRole("button", { name: "Recalcular perfil", exact: true }).click();
  await expect(
    panel.getByRole("combobox", { name: "Consultar perfil de precisão salvo" }),
  ).toBeVisible();
  await scale.selectOption("scaled");
  await page.getByLabel("Total de ensaios", { exact: true }).fill("6");
  await search.click();
  await apply.click();
  const original = (await save(page, info.outputPath("optimal-history-original.enzitag")))
    .experiments[0];
  expect(original.optimalDesigns).toHaveLength(2);
  expect(original.optimalVariances).toHaveLength(2);
  const [design] = original.optimalDesigns;
  const [profile, latestProfile] = original.optimalVariances;
  const archiveSelector = page.getByRole("combobox", { name: "Consultar planejamento salvo" });
  const profileSelector = panel.getByRole("combobox", {
    name: "Consultar perfil de precisão salvo",
  });
  await archiveSelector.focus();
  await archiveSelector.selectOption(design.id);
  await expect(archiveSelector).toBeFocused();
  await expect(page.getByTestId("optimal-archive-context")).toContainText(design.revisionId);
  await expect(apply).toHaveCount(0);
  await expect(scale).toHaveValue("scaled");
  await profileSelector.selectOption(profile.id);
  await expect(scale).toHaveValue("relative");
  await expect(
    panel.getByRole("combobox", { name: "Fator do eixo horizontal", exact: true }),
  ).toHaveValue("1");
  await expect(page.getByTestId("optimal-variance-spatial")).toBeVisible();
  const path = info.outputPath("optimal-history-reopen.enzitag");
  const saved = (await save(page, path)).experiments[0];
  expect(saved.optimalArtifactSelection).toEqual({
    designId: design.id,
    varianceByDesign: { [design.id]: profile.id },
  });
  expect(saved.optimalDesigns).toEqual(original.optimalDesigns);
  expect(saved.optimalVariances).toEqual(original.optimalVariances);
  expect(saved.analysisSelection).toEqual(original.analysisSelection);
  expect(saved.revisions).toEqual(original.revisions);

  await page.reload();
  await openArchive(page, path);
  await expect(archiveSelector).toHaveValue(design.id);
  await expect(profileSelector).toHaveValue(profile.id);
  await expect(scale).toHaveValue("relative");
  await expect(page.getByTestId("optimal-variance-spatial")).toBeVisible();
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(
    (await new AxeBuilder({ page }).include('[data-testid="optimal-panel"]').analyze()).violations,
  ).toEqual([]);
  await panel.screenshot({ path: info.outputPath("optimal-archived-profile-mobile.png") });
  await profileSelector.selectOption(latestProfile.id);
  await expect(scale).toHaveValue("scaled");
  await page.getByRole("checkbox", { name: /Mostrar todos os blocos/ }).uncheck();
  await page.getByTestId("optimal-config-optimal-config").click();
  await expect(panel).toBeHidden();
  await archiveSelector.selectOption("");
  await expect(page.getByTestId("optimal-result")).toBeVisible();
  await expect(profileSelector).toHaveCount(0);
  await archiveSelector.selectOption(design.id);
  await expect(profileSelector).toHaveValue(latestProfile.id);
  await noAutomaticEvaluation(page);
});

test("blocos salvos: distribuição condicional, resposta tardia e origem preservada", async ({
  page,
}, info) => {
  await page.goto("/");
  await openArchive(
    page,
    fileURLToPath(
      new URL(
        "../../../../validation/cases/et25/b08-variance-fixtures/two-new-blocks-quadratic-i.enzitag",
        import.meta.url,
      ),
    ),
  );
  const panel = page.getByTestId("optimal-variance-panel");
  await expect(page.getByTestId("optimal-variance-fds")).toBeVisible();
  await noAutomaticEvaluation(page);
  await panel
    .getByRole("combobox", { name: "Avaliações na distribuição", exact: true })
    .selectOption("2");
  await panel.getByRole("combobox", { name: "Bloco no mapa", exact: true }).selectOption("2");
  await expect(panel).toContainText("Block 3");
  await page.getByText("Valores e dados fonte", { exact: true }).click();
  await expect(page.getByTestId("optimal-variance-table").locator("tbody tr")).toHaveCount(9);
  await panel.screenshot({ path: info.outputPath("conditional-block.png") });
  for (const extension of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await panel
      .getByRole("button", { name: `Dados da variância (${extension})`, exact: true })
      .click();
    await (await pending).saveAs(
      info.outputPath(`variance-block-source.${extension.toLowerCase()}`),
    );
  }
  await page.evaluate(() => {
    (window as unknown as { varianceDelay: number }).varianceDelay = 1500;
  });
  await panel.getByRole("button", { name: "Recalcular perfil", exact: true }).click();
  await page.getByRole("button", { name: "Novo experimento", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Experimento ativo", exact: true })).toHaveValue(
    "e2",
  );
  // Synchronize on the actual delayed worker response; file downloads are not a completion signal.
  await expect
    .poll(
      () =>
        page.evaluate(() => (window as unknown as { varianceResponses: number }).varianceResponses),
      { timeout: 30000 },
    )
    .toBe(1);
  // Then verify the scoped reducer's saved output, independent of the active experiment.
  await expect
    .poll(
      async () => {
        const doc = await save(page, info.outputPath("variance-origin-race.enzitag"));
        return doc.experiments[0].optimalVariances?.length;
      },
      { timeout: 15000, intervals: [300, 500, 1000] },
    )
    .toBe(2);
  const doc = await save(page, info.outputPath("variance-origin-final.enzitag"));
  expect(doc.experiments[1].optimalVariances).toBeUndefined();
  expect(doc.experiments[0].optimalDesigns).toHaveLength(1);
  expect(doc.experiments[0].optimalVariances[0].id).not.toBe(
    doc.experiments[0].optimalVariances[1].id,
  );
  for (const record of doc.experiments[0].optimalVariances)
    expect(record.view).toMatchObject({ distributionBlock: 2, mapBlock: 2 });
});

test("um fator: curva, precisão guardada e bloqueio do protótipo divergente", async ({
  page,
}, info) => {
  await begin(page, ["Temperatura"], "quadratic", 5);
  await page.getByRole("button", { name: "Buscar planejamento", exact: true }).click();
  const panel = page.getByTestId("optimal-variance-panel");
  await panel.getByRole("button", { name: "Calcular perfil de variância", exact: true }).click();
  const figure = page.getByTestId("optimal-variance-spatial");
  await expect(figure).toBeVisible();
  await expect(figure.locator("[data-chart-data] circle")).toHaveCount(3);
  await expect(figure).toContainText("Variância ao longo do fator");
  await page.setViewportSize({ width: 375, height: 892 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await panel.screenshot({ path: info.outputPath("one-factor-mobile.png") });
  await page.setViewportSize({ width: 1064, height: 892 });
  await page.getByRole("button", { name: "Usar este planejamento nos dados", exact: true }).click();
  const doc = await save(page, info.outputPath("one-factor-variance.enzitag"));
  expect(doc.experiments[0].optimalVariances[0].result.points).toHaveLength(3);
  await page.reload();
  await openArchive(
    page,
    fileURLToPath(
      new URL(
        "../../../../validation/cases/et25/b08-blocks-fixtures/legacy-small-scale.enzitag",
        import.meta.url,
      ),
    ),
  );
  await expect(
    page.getByRole("button", { name: "Calcular perfil de variância", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("optimal-variance-panel")).toContainText(
    "A matriz aplicada deste arquivo antigo difere",
  );
  await noAutomaticEvaluation(page);
});

test("histórico com mil perfis: reabertura e salvamento sem novo cálculo", async ({
  page,
}, info) => {
  const input = JSON.parse(
    readFileSync(
      new URL(
        "../../../../validation/cases/et25/b08-optimal-cost-inputs/history-decode.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const archive = Buffer.from(input[0].operation.bytesBase64, "base64");
  const json = unzipSync(archive)["project.json"];
  if (!json) throw new Error("project.json");
  const previous = JSON.parse(strFromU8(json));
  const profiles = previous.experiments[0].optimalVariances;
  expect(profiles).toHaveLength(1000);
  const file = info.outputPath("historico-1000-original.enzitag");
  writeFileSync(file, archive);

  await page.goto("/");
  await openArchive(page, file);
  const figure = page.getByTestId("optimal-variance-fds");
  await expect(figure).toBeVisible();
  for (const width of [375, 1064]) {
    await page.setViewportSize({ width, height: 892 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 1,
    );
    await figure.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`historico-1000-${width}.png`) });
  }
  const saved = await save(page, info.outputPath("historico-1000-reaberto.enzitag"));
  expect(saved.experiments[0].optimalVariances).toEqual(profiles);
  await noAutomaticEvaluation(page);
});
