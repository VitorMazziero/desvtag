// Capture compatibility results from the frozen pre-budget WASM; no science in this adapter.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mixedRequest } from "./measure_et24.mjs";
const root = resolve(import.meta.dirname, "../..");
const read = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"));
const bytes = readFileSync(resolve(root, "app/web/src/services/engine/wasm/optima_wasm_bg.wasm"));
const sha256 = createHash("sha256").update(bytes).digest("hex");
assert.equal(sha256, read("validation/cases/et24/performance-precision-web/measurements.json").identity.wasmSha256, "Pre-budget artifact was replaced; do not fabricate an older result");
const { initSync, handleRequest } = await import(pathToFileURL(resolve(root, "app/web/src/services/engine/wasm/optima_wasm.js")));
initSync({ module: bytes });
const source = read("validation/cases/nonlinear_profile/profile.json").cases.find((c) => c.name === "monod").request;
const nonlinear = { ...source, profile: false,
  x: Array.from({ length: 5000 }, (_, i) => source.x[i % source.x.length]),
  y: Array.from({ length: 5000 }, (_, i) => source.y[i % source.y.length]),
};
const rows = Array.from({ length: 32 }, (_, unit) => Array.from({ length: 13 }, (_, time) => {
  let bits = unit & (time + 1), parity = 0;
  while (bits) { parity ^= bits & 1; bits >>>= 1; }
  return { unit: `u${unit + 1}`, time, y: 10 + 0.3 * time + (parity ? -1 : 1) };
})).flat();
const cases = [
  { file: "validation/cases/nonlinear_profile/pre_budget_5000.json", type: "modelNonlinear", request: nonlinear },
  { file: "validation/cases/repeated_covariance/pre_budget_q13.json", type: "modelMixed", request: mixedRequest({ rows, times: rows.map((r) => r.time), structure: "unstructured" }) },
];
for (const item of cases) {
  const responseJson = handleRequest(JSON.stringify({ protocolVersion: 1, taskId: "pre-budget-compatibility", operation: { type: item.type, ...item.request } }));
  const response = JSON.parse(responseJson);
  assert.equal(response.outcome.status, "ok", responseJson.slice(0, 1500));
  const { type, ...result } = response.outcome.result;
  writeFileSync(resolve(root, item.file), JSON.stringify({
    purpose: "Read-only compatibility outside the later operational envelope; not a new capacity claim or independent scientific reference.",
    preBudgetWasmSha256: sha256, request: item.request, result,
  }, null, 2));
  console.log(`Captured ${item.file} from the frozen pre-budget engine.`);
}
const evidence = resolve(root, ".local/validation/et24/performance-work-counts");
mkdirSync(evidence, { recursive: true });
writeFileSync(resolve(evidence, "pre-budget-compatibility.json"), JSON.stringify({ wasmSha256: sha256, files: cases.map((c) => c.file) }, null, 2));
