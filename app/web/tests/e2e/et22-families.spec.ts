import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool, openSaturationTool } from "./menus";

const scientific = [
  "mixtureAnalyze",
  "modelMixed",
  "comparisonPaired",
  "modelNonlinear",
  "powerAnalyze",
];
test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(15_000);
  await page.addInitScript(() => {
    localStorage.setItem("optima.showAllSections", "1");
    const host = window as unknown as { recordedOperations: string[] };
    host.recordedOperations = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const request = message as { requestJson?: string };
      if (request.requestJson)
        host.recordedOperations.push(JSON.parse(request.requestJson).operation.type);
      return Reflect.apply(original, this, [message, ...args]);
    };
  });
});

async function operations(page: Page) {
  return page.evaluate(
    () => (window as unknown as { recordedOperations: string[] }).recordedOperations,
  );
}

async function open(page: Page, name: string) {
  await page.goto("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(
    fileURLToPath(new URL(`../../../../examples/${name}/projeto.enzitag`, import.meta.url)),
  );
  await expect(page.getByLabel("Nome do projeto")).not.toHaveValue("");
}

async function saveAndReopen(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = (await (await pending).path())!;
  const document = JSON.parse(
    strFromU8(unzipSync(new Uint8Array(readFileSync(file)))["project.json"]!),
  );
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByTestId("saved-family-result")).toBeVisible();
  expect((await operations(page)).filter((op) => scientific.includes(op))).toEqual([]);
  return document;
}

test("T03: mixture is saved, keeps old names/points after edits and exports from Results", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await open(page, "07-misturas-scheffe");
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("mixture-model").selectOption("quadratic");
  await page.getByRole("button", { name: "Ajustar modelo", exact: true }).click();
  await expect(page.getByTestId("saved-family-result")).toHaveAttribute("data-family", "mixture");
  const figure = page.getByTestId("ternary-plot");
  const original = await figure.locator(".chart-canvas").innerHTML();
  const saved = await saveAndReopen(page);
  expect(saved.experiments[0].mixtureResult.records).toHaveLength(2);
  await expect(page.getByTestId("scheffe-coefficients").locator("tbody tr")).toHaveCount(6);
  expect(await figure.locator(".chart-canvas").innerHTML()).toBe(original);
  await page.locator(".steps .step").nth(1).click();
  await page.getByLabel("Nome", { exact: true }).first().fill("Nome editado após o cálculo");
  await page.locator(".steps .step").nth(4).click();
  await expect(page.getByTestId("saved-family-result").getByRole("status").first()).toContainText(
    "mudaram",
  );
  expect(await figure.locator(".chart-canvas").innerHTML()).toBe(original);
  await saveAndReopen(page);
  expect(await figure.locator(".chart-canvas").innerHTML()).toBe(original);
  for (const [button, filename] of [
    ["report-button", "T03-mixture.html"],
    ["report-pdf-button", "T03-mixture.pdf"],
    ["report-docx-button", "T03-mixture.docx"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByTestId(button!).click();
    await (await pending).saveAs(info.outputPath(filename!));
  }
  const html = readFileSync(info.outputPath("T03-mixture.html"), "utf8");
  expect(html).toContain("mixture_model");
  expect(html).toContain("scheffe-coefficients");
  expect(html).not.toContain("Nome editado após o cálculo");
  for (const format of ["CSV", "XLSX"]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: `Coeficientes (${format})`, exact: true }).click();
    await (await pending).saveAs(info.outputPath(`T03-coefficients.${format.toLowerCase()}`));
  }
  const historical = saved.experiments[0].mixtureResult.records.at(-1);
  const exactEstimate = historical.result.fit.coefficients[0].estimate.value;
  const csv = readFileSync(info.outputPath("T03-coefficients.csv"), "utf8");
  expect(csv).toContain(String(exactEstimate));
  expect(csv).toContain(`# analysis: ${historical.id}`);
  expect(csv).toContain("# undefinedStates:");
  const workbook = unzipSync(
    new Uint8Array(readFileSync(info.outputPath("T03-coefficients.xlsx"))),
  );
  expect(strFromU8(workbook["xl/worksheets/sheet1.xml"]!)).toContain(`<v>${exactEstimate}</v>`);
  await page
    .getByTestId("saved-family-result")
    .screenshot({ path: info.outputPath("T03-mixture-result.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("T05: nonlinear and power coexist and reopening does not refit either", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("optima.showAllSections", "0"));
  await open(page, "08-saturacao-monod");
  await page.getByTestId("section-charts").click();
  const tool = await openSaturationTool(page);
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await expect(page.getByTestId("saturation-dialog")).not.toBeVisible();
  await expect(page.getByTestId("saturation-result")).toBeVisible();
  await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("saturation-chart")).not.toBeVisible();
  const curve = await page.getByTestId("saturation-chart").locator(".chart-canvas").innerHTML();
  await saveAndReopen(page);
  expect(await page.getByTestId("saturation-chart").locator(".chart-canvas").innerHTML()).toBe(
    curve,
  );
  const power = await openPowerTool(page);
  await power.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-dialog")).not.toBeVisible();
  await expect(page.getByTestId("power-summary")).toContainText("37 por grupo");
  await expect(page.getByTestId("section-summary")).toHaveAttribute("aria-current", "page");
  const saved = await saveAndReopen(page);
  expect(saved.experiments[0].powerResult.records).toHaveLength(1);
  expect(saved.experiments[0].nonlinearResult.records).toHaveLength(2);
  await page.getByTestId("result-family").selectOption("nonlinear");
  expect(await page.getByTestId("saturation-chart").locator(".chart-canvas").innerHTML()).toBe(
    curve,
  );
  await page
    .getByTestId("saved-family-result")
    .screenshot({ path: info.outputPath("T05-saturation-result.png") });
  await page.getByTestId("result-family").selectOption("power");
  await page
    .getByTestId("saved-family-result")
    .screenshot({ path: info.outputPath("T06-power-result.png") });
});

test("T04: paired and mixed models retain separate immutable records", async ({ page }, info) => {
  test.setTimeout(120_000);
  await open(page, "11-medidas-repetidas");
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("repeated-method").selectOption("paired");
  await page.getByLabel("Estrutura das observações").selectOption("repeated");
  await page.getByRole("button", { name: "Comparar pares", exact: true }).click();
  await expect(page.getByTestId("paired-result")).toContainText("6 pares");
  await page.locator(".steps .step").nth(3).click();
  await page.getByTestId("repeated-method").selectOption("mixed");
  await page.getByRole("button", { name: "Ajustar modelo misto", exact: true }).click();
  await expect(page.getByTestId("mixed-result")).toBeVisible();
  const saved = await saveAndReopen(page);
  expect(
    saved.experiments[0].mixedModelResult.records.map(
      (r: { result: { type: string } }) => r.result.type,
    ),
  ).toEqual(["paired", "mixed", "paired", "mixed"]);
  await expect(page.getByTestId("variance-components")).toContainText("0,961");
  await expect(page.getByTestId("mixed-random-effects").locator("tbody tr")).toHaveCount(6);
  const records = saved.experiments[0].mixedModelResult.records.slice(-2);
  await page.getByTestId("result-record").selectOption(records[0].id);
  await expect(page.getByTestId("paired-result")).toContainText("6 pares");
  await expect(page.getByTestId("mixed-result")).toHaveCount(0);
  const thread = page.getByTestId("comments-table-paired-statistics");
  await thread.locator(":scope > summary").click();
  await thread
    .getByLabel("Novo comentário", { exact: true })
    .fill("Conferir o resultado pareado histórico");
  await thread.getByRole("button", { name: "Comentar", exact: true }).click();
  for (const [button, filename] of [
    ["report-button", "T07-paired.html"],
    ["report-pdf-button", "T07-paired.pdf"],
    ["report-docx-button", "T07-paired.docx"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByTestId(button!).click();
    await (await pending).saveAs(info.outputPath(filename!));
  }
  const historicalReport = readFileSync(info.outputPath("T07-paired.html"), "utf8");
  expect(historicalReport).toContain("paired_comparison");
  expect(historicalReport).not.toContain("linear_mixed_model");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const withComment = JSON.parse(
    strFromU8(
      unzipSync(new Uint8Array(readFileSync((await (await pending).path())!)))["project.json"]!,
    ),
  );
  const comment = withComment.experiments[0].comments.find(
    (c: { text: string }) => c.text === "Conferir o resultado pareado histórico",
  );
  expect(comment.target.analysisId).toBe(records[0].id);
  expect(comment.revisionId).toBe(records[0].revisionId);
  await page.getByTestId("result-record").selectOption(records[1].id);
  await expect(page.getByTestId("mixed-result")).toBeVisible();
  await page
    .getByTestId("saved-family-result")
    .screenshot({ path: info.outputPath("T04-mixed-result.png") });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("T06: invalid edited power assumptions survive reopening without replacing the old result", async ({
  page,
}) => {
  await open(page, "08-saturacao-monod");
  let tool = await openPowerTool(page);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-summary")).toContainText("37 por grupo");
  tool = await openPowerTool(page);
  await tool.getByLabel("Nível de significância (α)", { exact: true }).fill("2");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(tool.getByLabel("Nível de significância (α)", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.keyboard.press("Escape");
  const document = await saveAndReopen(page);
  expect(document.experiments[0].powerResult.selection.alpha).toBe("2");
  expect(document.experiments[0].powerResult.records).toHaveLength(1);
  expect(document.experiments[0].powerResult.records[0].input.alpha).toBe(0.05);
  await expect(page.getByTestId("saved-family-result").getByRole("status").first()).toContainText(
    "mudaram",
  );
  tool = await openPowerTool(page);
  await expect(tool.getByLabel("Nível de significância (α)", { exact: true })).toHaveValue("2");
  await tool.getByLabel("Nível de significância (α)", { exact: true }).fill("0.05");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("saved-family-result").locator(".stale-notice")).toHaveCount(0);
  // Measured observations are unrelated to these prospective assumptions.
  await page.locator(".steps .step").nth(2).click();
  const response = page.getByRole("textbox", { name: / — Obs\. 1$/, exact: false }).last();
  await response.fill("999");
  await page.locator(".steps .step").nth(4).click();
  await expect(page.getByTestId("saved-family-result").locator(".stale-notice")).toHaveCount(0);
});

test("T09: closing a deferred family operation preserves its original experiment without saving a cancelled result", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const host = window as unknown as { lateSubmissionAttempted: boolean };
    host.lateSubmissionAttempted = false;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const payload = message as { requestJson?: string };
      if (
        payload.requestJson &&
        JSON.parse(payload.requestJson).operation.type === "modelNonlinear"
      ) {
        setTimeout(() => {
          host.lateSubmissionAttempted = true;
          Reflect.apply(original, this, [message, ...args]);
        }, 1500);
      } else Reflect.apply(original, this, [message, ...args]);
    };
  });
  await open(page, "08-saturacao-monod");
  const old = await page
    .getByRole("combobox", { name: "Experimento ativo", exact: true })
    .inputValue();
  const tool = await openSaturationTool(page);
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Novo experimento", exact: true }).click();
  const current = await page
    .getByRole("combobox", { name: "Experimento ativo", exact: true })
    .inputValue();
  expect(current).not.toBe(old);
  // Block 03 cancels on close: even a deferred submission must not add a record.
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { lateSubmissionAttempted: boolean }).lateSubmissionAttempted,
      ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(async (id) => {
        const db = await new Promise<IDBDatabase>((ok, fail) => {
          const q = indexedDB.open("enzitag-optima", 1);
          q.onsuccess = () => ok(q.result);
          q.onerror = fail;
        });
        try {
          const value = await new Promise<
            | {
                workspace?: {
                  experiments: Array<{ id: string; nonlinearResult?: { records: unknown[] } }>;
                };
              }
            | undefined
          >((ok, fail) => {
            const q = db.transaction("recovery").objectStore("recovery").get("workspace");
            q.onsuccess = () => ok(q.result);
            q.onerror = fail;
          });
          return (
            value?.workspace?.experiments.find((e) => e.id === id)?.nonlinearResult?.records
              .length ?? 0
          );
        } finally {
          db.close();
        }
      }, old),
    )
    .toBe(1);
  await expect(page.getByRole("combobox", { name: "Experimento ativo", exact: true })).toHaveValue(
    current,
  );
  await expect(page.getByTestId("saved-family-result")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Experimento ativo", exact: true }).selectOption(old);
  await page.locator(".steps .step").nth(4).click();
  await expect(page.getByTestId("saturation-result")).toBeVisible();
  await expect(page.getByTestId("result-record")).toHaveCount(0);
});

test("T09: reload offers recovery of coexisting saved results", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await open(page, "08-saturacao-monod");
  const tool = await openPowerTool(page);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-summary")).toContainText("37 por grupo");
  // The two-second production autosave must complete before simulating a restart.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((ok, fail) => {
          const q = indexedDB.open("enzitag-optima", 1);
          q.onsuccess = () => ok(q.result);
          q.onerror = fail;
        });
        try {
          return await new Promise<boolean>((ok, fail) => {
            const q = db.transaction("recovery").objectStore("recovery").get("workspace");
            q.onsuccess = () =>
              ok(
                Boolean(
                  q.result?.workspace?.experiments.some(
                    (e: { nonlinearResult?: unknown; powerResult?: unknown }) =>
                      e.nonlinearResult && e.powerResult,
                  ),
                ),
              );
            q.onerror = fail;
          });
        } finally {
          db.close();
        }
      }),
    )
    .toBe(true);
  await page.reload();
  const recovery = page.getByTestId("recovery-banner");
  await expect(recovery).toBeVisible();
  await recovery.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(page.getByTestId("power-summary")).toContainText("37 por grupo");
  await page.getByTestId("result-family").selectOption("nonlinear");
  await expect(page.getByTestId("saturation-chart")).toBeVisible();
});
