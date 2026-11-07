import { measureEngine, memorySnapshot } from "../../../validation/tools/measure_et24.mjs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export async function runPerformanceCheck(page, directory, pid) {
  await measureEngine(
    (requestJson) => page.evaluate((requestJson) => window.__TAURI_INTERNALS__.invoke("engine_request", { requestJson }), requestJson),
    "Windows real Tauri IPC", directory, () => memorySnapshot([], pid),
    { binarySha256: createHash("sha256").update(readFileSync(process.argv[2])).digest("hex"), userAgent: await page.evaluate(() => navigator.userAgent) },
  );
}
