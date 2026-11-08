import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool, openSaturationTool } from "./menus";
import { cases, setupProfile } from "./nonlinearTools";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const host = window as unknown as {
      failPower: boolean;
      failNonlinear: boolean;
      delayPower: boolean;
      delaySave: boolean;
      savePending: boolean;
      started: number;
      terminated: number;
      workers: Worker[];
    };
    host.failPower = false;
    host.failNonlinear = false;
    host.delayPower = false;
    host.delaySave = false;
    host.savePending = false;
    host.started = 0;
    host.terminated = 0;
    host.workers = [];
    const post = Worker.prototype.postMessage,
      terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      host.terminated++;
      return Reflect.apply(terminate, this, []);
    };
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const request = message as { requestJson?: string };
      const operation = request.requestJson ? JSON.parse(request.requestJson).operation.type : "";
      if (operation === "modelNonlinear" && host.failNonlinear) {
        host.failNonlinear = false;
        setTimeout(
          () =>
            this.dispatchEvent(
              new ErrorEvent("error", {
                message: "Injected nonlinear worker failure",
                cancelable: true,
              }),
            ),
          10,
        );
        return;
      }
      if (operation === "powerAnalyze") {
        host.started++;
        if (host.failPower) {
          host.failPower = false;
          setTimeout(
            () =>
              this.dispatchEvent(
                new ErrorEvent("error", { message: "Injected worker failure", cancelable: true }),
              ),
            10,
          );
          return;
        }
        if (host.delayPower) {
          setTimeout(() => Reflect.apply(post, this, [message, ...args]), 800);
          return;
        }
      }
      if (operation === "projectEncode" && host.delaySave) {
        host.savePending = true;
        const id = (message as { id: number }).id;
        const saved = (event: MessageEvent) => {
          if (event.data.id === id) {
            host.savePending = false;
            this.removeEventListener("message", saved);
          }
        };
        this.addEventListener("message", saved);
        setTimeout(() => Reflect.apply(post, this, [message, ...args]), 1600);
        return;
      }
      return Reflect.apply(post, this, [message, ...args]);
    };
  });
});
test("AU-U08: worker failure is focused, preserves history and retry runs real WASM", async ({
  page,
}, info) => {
  const { tool } = await setupPower(page, "contrast_unequal");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-result")).toBeVisible();
  const original = await page.getByTestId("power-result").textContent();
  await openPowerTool(page);
  await page.evaluate(() => {
    (window as unknown as { failPower: boolean }).failPower = true;
  });
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  const error = tool.getByRole("alert");
  await expect(error).toContainText("Os resultados anteriores foram preservados");
  await expect(error).toBeFocused();
  await expect(tool.getByRole("button", { name: "Calcular", exact: true })).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await error.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const body = el.closest(".modal-body")?.getBoundingClientRect();
      return Boolean(
        body &&
          r.top >= body.top - 1 &&
          r.bottom <= body.bottom + 1 &&
          r.top >= 0 &&
          r.bottom <= innerHeight,
      );
    }),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("transport-failure.png") });
  await page.keyboard.press("Escape");
  expect(await page.getByTestId("power-result").textContent()).toBe(original);
  await openPowerTool(page);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("result-record").locator("option")).toHaveCount(2);
});
test("AU-B07: closing a busy tool cancels its worker; saving and the next calculation succeed", async ({
  page,
}, info) => {
  const { tool } = await setupPower(page, "contrast_unequal");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-result")).toBeVisible();
  await openPowerTool(page);
  await page.evaluate(() => {
    (window as unknown as { delayPower: boolean }).delayPower = true;
  });
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(tool.locator('[aria-busy="true"]')).toBeVisible();
  await expect(
    tool.getByText("Aguardando ou calculando em segundo plano.", { exact: false }),
  ).toBeVisible();
  await tool.getByTestId("power-cancel").click();
  await expect(tool.getByTestId("power-cancel")).toHaveCount(0);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await page.keyboard.press("Escape");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const file = info.outputPath("preserved.enzitag");
  await (await pending).saveAs(file);
  const bytes = unzipSync(new Uint8Array(readFileSync(file)))["project.json"];
  if (!bytes) throw new Error("Missing project JSON");
  const doc = JSON.parse(strFromU8(bytes));
  expect(doc.experiments[0].powerResult.records).toHaveLength(1);
  expect(
    await page.evaluate(() => (window as unknown as { terminated: number }).terminated),
  ).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => {
    (window as unknown as { delayPower: boolean }).delayPower = false;
  });
  await openPowerTool(page);
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("result-record").locator("option")).toHaveCount(2);
  await page.getByTestId("power-result").screenshot({ path: info.outputPath("recovered.png") });
});

test("AU-B07: cancel during an already pending real project save leaves that save intact", async ({
  page,
}, info) => {
  const { tool } = await setupPower(page, "contrast_unequal");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-result")).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { delaySave: boolean }).delaySave = true;
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  await openPowerTool(page);
  await page.evaluate(() => {
    (window as unknown as { delayPower: boolean }).delayPower = true;
  });
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  expect(
    await page.evaluate(() => (window as unknown as { savePending: boolean }).savePending),
  ).toBe(true);
  await tool.getByTestId("power-cancel").click();
  const file = info.outputPath("concurrent-save.enzitag");
  await (await download).saveAs(file);
  const json = unzipSync(new Uint8Array(readFileSync(file)))["project.json"];
  if (!json) throw new Error("Project save lost");
  const doc = JSON.parse(strFromU8(json));
  expect(doc.experiments[0].powerResult.records).toHaveLength(1);
  expect(await page.evaluate(() => (window as unknown as { terminated: number }).terminated)).toBe(
    1,
  );
  await page.keyboard.press("Escape");
  await page.screenshot({ path: info.outputPath("concurrent-save-complete.png"), fullPage: true });
});

test("AU-U08: nonlinear transport failure is visible and retry preserves the historical fit", async ({
  page,
}, info) => {
  const tool = await setupProfile(page, cases[0]);
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await expect(page.getByTestId("saturation-result")).toBeVisible();
  const original = await page.getByTestId("saturation-result").textContent();
  await openSaturationTool(page);
  await page.evaluate(() => {
    (window as unknown as { failNonlinear: boolean }).failNonlinear = true;
  });
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  const error = tool.getByRole("alert");
  await expect(error).toContainText("Os resultados anteriores foram preservados");
  await expect(error).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: info.outputPath("nonlinear-transport-failure.png") });
  await page.keyboard.press("Escape");
  expect(await page.getByTestId("saturation-result").textContent()).toBe(original);
  await openSaturationTool(page);
  await tool.getByRole("button", { name: "Ajustar curva", exact: true }).click();
  await expect(page.getByTestId("result-record").locator("option")).toHaveCount(2);
});
