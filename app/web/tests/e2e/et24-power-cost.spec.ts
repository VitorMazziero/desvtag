import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
import { openPowerTool } from "./menus";
import { setupPower } from "./powerTools";

test.use({ locale: "pt-BR", acceptDownloads: true });
test("T06 worker cancellation preserves the previous result and the next calculation succeeds", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const { tool } = await setupPower(page, "regression_correlated");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-simulation-result")).toBeVisible();
  const original = await page.getByTestId("power-result").textContent();
  await openPowerTool(page);
  await tool.getByTestId("power-simulation-replications").fill("1000000");
  // An actual F test with 32 numerator components makes simulation materially
  // longer than a UI click; throttling the page does not throttle its WASM worker.
  const predictors = Array.from({ length: 64 }, (_, row) =>
    Array.from({ length: 32 }, (_, column) => {
      let bits = row & (column + 1),
        parity = 0;
      while (bits) {
        parity ^= bits & 1;
        bits >>>= 1;
      }
      return parity ? -1 : 1;
    }),
  );
  await tool
    .getByTestId("power-predictors")
    .fill(predictors.map((row) => row.join("\t")).join("\n"));
  await tool.getByTestId("power-coefficients").fill(Array(32).fill("0.01").join(";"));
  const start = performance.now();
  // Click the actual cancel control in the first DOM update that exposes it.
  // This avoids racing the separate automation round trip against fast WebKit execution.
  await tool.getByRole("button", { name: "Calcular", exact: true }).evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error("Expected calculation button");
    const host = window as unknown as { cancelledActualWork: boolean; actualPosts: number };
    host.cancelledActualWork = false;
    host.actualPosts = 0;
    const post = Worker.prototype.postMessage;
    function cancelWhenSubmitted() {
      const cancel = document.querySelector<HTMLButtonElement>('[data-testid="power-cancel"]');
      if (cancel && host.actualPosts > 0) {
        observer.disconnect();
        Worker.prototype.postMessage = post;
        cancel.click();
        host.cancelledActualWork = true;
      }
    }
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const request = message as { requestJson?: string };
      if (request.requestJson && JSON.parse(request.requestJson).operation.type === "powerAnalyze")
        host.actualPosts++;
      const result = Reflect.apply(post, this, [message, ...args]);
      queueMicrotask(cancelWhenSubmitted);
      return result;
    };
    const observer = new MutationObserver(cancelWhenSubmitted);
    observer.observe(document.body, { subtree: true, childList: true });
    button.click();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { cancelledActualWork: boolean }).cancelledActualWork,
      ),
    )
    .toBe(true);
  await expect(tool.getByTestId("power-cancel")).toHaveCount(0);
  await expect(page.getByTestId("power-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await page.getByTestId("power-result").textContent()).toBe(original);
  await expect(page.getByTestId("result-record")).toHaveCount(0);
  await openPowerTool(page);
  await tool.getByTestId("power-simulation-replications").fill("1000");
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("result-record").locator("option")).toHaveCount(2);
  await expect(page.getByTestId("power-simulation-result")).toContainText("1000");
  writeFileSync(
    info.outputPath("cancellation.json"),
    JSON.stringify(
      {
        elapsedMilliseconds: performance.now() - start,
        predictors: 32,
        studies: 1000000,
        artificialDelay: false,
        preservedRecords: 1,
        nextRecords: 2,
      },
      null,
      2,
    ),
  );
  await page
    .getByTestId("power-simulation-result")
    .screenshot({ path: info.outputPath("after-cancel.png") });
});

test("T06-T07 maximum predictor matrix and one million studies: bounded preview, full CSV and report", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    const host = window as unknown as {
      budget: {
        calculations: number;
        maximumFrameGap: number;
        feedback: number | null;
        start: number;
        afterInput: boolean;
        afterInputMaximumFrameGap: number;
      };
    };
    host.budget = {
      calculations: 0,
      maximumFrameGap: 0,
      feedback: null,
      start: 0,
      afterInput: false,
      afterInputMaximumFrameGap: 0,
    };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...args: unknown[]) {
      const request = message as { requestJson?: string };
      if (request.requestJson && JSON.parse(request.requestJson).operation.type === "powerAnalyze")
        host.budget.calculations++;
      return Reflect.apply(post, this, [message, ...args]);
    };
    let previous = performance.now();
    const frame = (now: number) => {
      host.budget.maximumFrameGap = Math.max(host.budget.maximumFrameGap, now - previous);
      if (host.budget.afterInput)
        host.budget.afterInputMaximumFrameGap = Math.max(
          host.budget.afterInputMaximumFrameGap,
          now - previous,
        );
      previous = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const { tool } = await setupPower(page, "regression_correlated");
  // First 32 nonconstant columns of a 4096-row Walsh design: no numerical fitting in TS.
  const rows = Array.from({ length: 4096 }, (_, row) =>
    Array.from({ length: 32 }, (_, column) => {
      let bits = row & (column + 1),
        parity = 0;
      while (bits) {
        parity ^= bits & 1;
        bits >>>= 1;
      }
      return parity ? -1 : 1;
    }),
  );
  const profiler = process.env.ET24_PROFILE_INPUT ? await page.context().newCDPSession(page) : null;
  if (profiler) {
    await profiler.send("Profiler.enable");
    await profiler.send("Profiler.start");
    await profiler.send("Tracing.start", {
      categories: "devtools.timeline,v8.execute,blink.user_timing",
      transferMode: "ReturnAsStream",
    });
  }
  const inputStarted = performance.now();
  const text = rows.map((r) => r.join("\t")).join("\n");
  const realPaste = process.env.ET24_REAL_PASTE === "1";
  if (realPaste) {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate((text) => navigator.clipboard.writeText(text), text);
    await tool.getByTestId("power-predictors").focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Control+V");
    expect(await tool.getByTestId("power-predictors").inputValue()).toBe(text);
  } else await tool.getByTestId("power-predictors").fill(text);
  const inputMilliseconds = performance.now() - inputStarted;
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.evaluate(() => {
    (window as unknown as { budget: { afterInput: boolean } }).budget.afterInput = true;
  });
  if (profiler) {
    const { profile } = await profiler.send("Profiler.stop");
    writeFileSync(info.outputPath("input-profile.json"), JSON.stringify(profile));
    const complete = new Promise<string>((resolve, reject) => {
      profiler.once("Tracing.tracingComplete", (event) => {
        if (event.stream) resolve(event.stream);
        else reject(new Error("Input trace did not provide a readable stream"));
      });
    });
    await profiler.send("Tracing.end");
    const handle = await complete;
    let trace = "";
    let eof = false;
    while (!eof) {
      const chunk = await profiler.send("IO.read", { handle });
      trace += chunk.data;
      eof = chunk.eof;
    }
    await profiler.send("IO.close", { handle });
    writeFileSync(info.outputPath("input-trace.json"), trace);
    if (process.env.ET24_PROFILE_INPUT === "only") {
      writeFileSync(
        info.outputPath("input-cost.json"),
        JSON.stringify({ inputMilliseconds, rows: 4096, predictors: 32 }),
      );
      return;
    }
  }
  await tool.getByTestId("power-coefficients").fill(Array(32).fill("0.01").join(";"));
  await tool.getByTestId("power-input-n").fill("24");
  await tool.getByTestId("power-simulation-replications").fill("1000000");
  const start = performance.now();
  await page.evaluate(() => {
    const budget = (window as unknown as { budget: { feedback: number | null; start: number } })
      .budget;
    budget.start = performance.now();
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-testid="power-cancel"]')) {
        budget.feedback = performance.now() - budget.start;
        observer.disconnect();
      }
    });
    observer.observe(document.body, { subtree: true, childList: true });
  });
  await tool.getByRole("button", { name: "Calcular", exact: true }).click();
  await expect(page.getByTestId("power-simulation-result")).toBeVisible();
  const elapsedMilliseconds = performance.now() - start;
  const timings: Record<string, number> = {
    input: inputMilliseconds,
    calculation: elapsedMilliseconds,
  };
  await expect(page.getByTestId("power-summary")).toContainText("98304");
  const matrix = page.getByTestId("power-predictor-matrix");
  await expect(matrix.locator("tbody tr")).toHaveCount(20);
  let pending = page.waitForEvent("download");
  let phase = performance.now();
  await matrix.getByRole("button", { name: /\(CSV\)$/ }).click();
  const csvPath = info.outputPath("full-matrix.csv");
  await (await pending).saveAs(csvPath);
  timings.csv = performance.now() - phase;
  const csv = readFileSync(csvPath, "utf8");
  expect(
    csv
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#")).length,
  ).toBe(4097);
  pending = page.waitForEvent("download");
  phase = performance.now();
  await matrix.getByRole("button", { name: /\(XLSX\)$/ }).click();
  const xlsxPath = info.outputPath("full-matrix.xlsx");
  await (await pending).saveAs(xlsxPath);
  timings.xlsx = performance.now() - phase;
  const entries = unzipSync(new Uint8Array(readFileSync(xlsxPath)));
  const sheetBytes = entries["xl/worksheets/sheet1.xml"];
  if (!sheetBytes) throw new Error("Full matrix XLSX has no data sheet");
  const sheet = strFromU8(sheetBytes);
  expect(sheet.match(/<row\b/g)?.length).toBe(4097);
  pending = page.waitForEvent("download");
  phase = performance.now();
  await page.getByTestId("report-button").click();
  const reportPath = info.outputPath("full-matrix.html");
  await (await pending).saveAs(reportPath);
  timings.html = performance.now() - phase;
  const html = readFileSync(reportPath, "utf8");
  expect(
    html
      .match(/<section data-testid="power-predictor-matrix"[\s\S]*?<\/section>/)?.[0]
      .match(/<tr>/g)?.length,
  ).toBe(4097);
  if (process.env.ET24_LARGE_PAPER === "1")
    for (const [id, ext] of [
      ["report-pdf-button", "pdf"],
      ["report-docx-button", "docx"],
    ]) {
      if (!id || !ext) throw new Error("Missing report control");
      pending = page.waitForEvent("download");
      phase = performance.now();
      await page.getByTestId(id).click();
      await (await pending).saveAs(info.outputPath(`full-matrix.${ext}`));
      timings[ext] = performance.now() - phase;
    }
  pending = page.waitForEvent("download");
  phase = performance.now();
  await page.getByRole("button", { name: "Salvar (baixar .desvtag)", exact: true }).click();
  const projectFile = info.outputPath("full-matrix.enzitag");
  await (await pending).saveAs(projectFile);
  timings.save = performance.now() - phase;
  const responsiveness = await page.evaluate(
    () => (window as unknown as { budget: unknown }).budget,
  );
  await page.reload();
  const chooser = page.waitForEvent("filechooser");
  phase = performance.now();
  await page.getByRole("button", { name: "Abrir…", exact: true }).click();
  await (await chooser).setFiles(projectFile);
  await expect(page.getByTestId("power-result")).toBeVisible();
  timings.reopen = performance.now() - phase;
  expect(
    await page.evaluate(
      () => (window as unknown as { budget: { calculations: number } }).budget.calculations,
    ),
  ).toBe(0);
  writeFileSync(
    info.outputPath("cost.json"),
    JSON.stringify(
      {
        elapsedMilliseconds,
        inputMethod: realPaste
          ? "Trusted Ctrl+V, isolated Chromium headless clipboard"
          : "Playwright/CDP fill",
        timings,
        responsiveness,
        rows: 4096,
        predictors: 32,
        total: 98304,
        studies: 1000000,
        previewRows: 20,
        csvRows: 4096,
        reportRows: 4096,
      },
      null,
      2,
    ),
  );
  await matrix.screenshot({ path: info.outputPath("matrix-preview.png") });
});
