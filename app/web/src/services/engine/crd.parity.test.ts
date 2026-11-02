// @vitest-environment node
// DIC aleatorizado no WebAssembly: as mesmas ordens de execução da reimplementação independente
// em Python (validation/tools/make_crd_cases.py), verificadas também no teste nativo
// (app/crates/optima-core/tests/crd_validation.rs). Igualdade exata entre Python, Rust nativo e
// WebAssembly = a mesma semente produz a mesma ordem de execução nos dois alvos.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type EngineResponse, type GeneratedCrd, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const casesFile = resolve(
  __dirname,
  "../../../../../validation/cases/completely_randomized_design/crd.json",
);

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/optima_wasm_bg.wasm")) });
});

function run(operation: unknown): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId: "c", operation })),
  ) as EngineResponse;
}

// biome-ignore lint/suspicious/noExplicitAny: arquivo JSON de referência
type Json = Record<string, any>;

describe("completely randomized design in WebAssembly", () => {
  it("generates the same execution order as the independent implementation", () => {
    // A semente do contrato JSON é um inteiro seguro (≤ 2^53 − 1); casos maiores só valem no nativo.
    const cases = ((JSON.parse(readFileSync(casesFile, "utf8")) as Json).cases as Json[]).filter(
      (c) => Number.isSafeInteger(c.seed),
    );
    expect(cases.length).toBeGreaterThanOrEqual(5);
    for (const c of cases) {
      const response = run({
        type: "designCrdGenerate",
        factorId: "f1",
        factorName: "Fator",
        levels: c.levels,
        replicates: c.replicates,
        randomize: c.randomize,
        seed: c.seed,
      });
      if (response.outcome.status !== "ok" || response.outcome.result.type !== "designCrdGenerate")
        throw new Error(JSON.stringify(response.outcome));
      const crd = response.outcome.result as unknown as GeneratedCrd;
      expect(crd.runs.length).toBe(c.runs.length);
      crd.runs.forEach((r, i) => {
        const w = c.runs[i];
        expect([r.standardOrder, r.levelIndex, r.level, r.replicate]).toEqual([
          w.standardOrder,
          w.levelIndex,
          w.level,
          w.replicate,
        ]);
      });
    }
  });

  it("refuses duplicated levels with a typed code", () => {
    const response = run({
      type: "designCrdGenerate",
      factorId: "f1",
      factorName: "Fator",
      levels: ["A", "A"],
      replicates: 3,
      randomize: true,
      seed: 1,
    });
    expect(response.outcome.status).toBe("error");
    if (response.outcome.status === "error")
      expect(response.outcome.error.issues.map((i) => i.code)).toEqual([
        "design.crd_duplicate_level",
      ]);
  });

  it("is registered in the engine capabilities", () => {
    const response = run({ type: "engineInfo" });
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "engineInfo")
      throw new Error("engineInfo");
    const ids = response.outcome.result.capabilities.methods.map((m) => m.id);
    expect(ids).toContain("completely_randomized_design");
  });
});
