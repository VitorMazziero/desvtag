// @vitest-environment node
// Paridade e validação no WebAssembly: os mesmos casos de referência independente
// (validation/cases/descriptive_summary) executados pelo motor compilado para WASM,
// pelo mesmo protocolo JSON usado no navegador, com as mesmas tolerâncias do teste nativo
// (app/crates/optima-core/tests/descriptive_validation.rs).
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type EngineResponse, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases/descriptive_summary");
const wasmFile = resolve(__dirname, "wasm/optima_wasm_bg.wasm");

beforeAll(() => {
  initSync({ module: readFileSync(wasmFile) });
});

function relativeError(actual: number, expected: number): number {
  return expected === 0 ? Math.abs(actual) : Math.abs((actual - expected) / expected);
}

const cases = readdirSync(casesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe("descriptive_summary in WebAssembly vs independent references", () => {
  it("finds the nine NIST cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(9);
  });

  it.each(cases)("%s", (name) => {
    const dir = join(casesDir, name);
    const values = readFileSync(join(dir, "input.csv"), "utf8")
      .split("\n")
      .slice(1)
      .filter((l) => l.trim() !== "")
      .map((l) => Number(l.trim()));
    const expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf8"));
    const request = {
      protocolVersion: PROTOCOL_VERSION,
      taskId: name,
      operation: {
        type: "descriptiveSummarize",
        dataset: {
          factors: [],
          responses: [{ id: "y", name: "y", unit: null }],
          observations: values.map((v, i) => ({
            id: `o${i + 1}`,
            unitId: null,
            factors: [],
            responses: [v],
          })),
        },
        responseId: "y",
        groupBy: [],
      },
    };
    const response = JSON.parse(handleRequest(JSON.stringify(request))) as EngineResponse;
    expect(response.outcome.status).toBe("ok");
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "descriptiveSummarize")
      return;
    const { overall } = response.outcome.result;
    const value = (s: { status: string; value?: number }) => {
      expect(s.status).toBe("defined");
      return s.value as number;
    };

    const tol = expected.tolerances.relative as number;
    const exact = expected.exactOnBinary64Inputs;
    expect(overall.nValid).toBe(expected.n);
    expect(relativeError(value(overall.mean), exact.mean)).toBeLessThanOrEqual(tol);
    expect(relativeError(value(overall.variance), exact.variance)).toBeLessThanOrEqual(tol);
    expect(relativeError(value(overall.sd), exact.sd)).toBeLessThanOrEqual(tol);
    expect(value(overall.min)).toBe(exact.min);
    expect(value(overall.max)).toBe(exact.max);

    const certMean = Number(expected.certifiedNist.mean);
    const certSd = Number(expected.certifiedNist.sd);
    expect(Math.abs(value(overall.mean) - certMean)).toBeLessThanOrEqual(
      expected.certifiedBounds.mean + tol * Math.abs(certMean),
    );
    expect(Math.abs(value(overall.sd) - certSd)).toBeLessThanOrEqual(
      expected.certifiedBounds.sd + tol * Math.abs(certSd),
    );
  });

  it("undefined statistics stay explicit through the WASM boundary", () => {
    const request = {
      protocolVersion: PROTOCOL_VERSION,
      taskId: "u",
      operation: {
        type: "descriptiveSummarize",
        dataset: {
          factors: [],
          responses: [{ id: "y", name: "y", unit: null }],
          observations: [{ id: "o1", unitId: null, factors: [], responses: [5] }],
        },
        responseId: "y",
        groupBy: [],
      },
    };
    const response = JSON.parse(handleRequest(JSON.stringify(request))) as EngineResponse;
    if (
      response.outcome.status !== "ok" ||
      response.outcome.result.type !== "descriptiveSummarize"
    ) {
      throw new Error("esperava resultado");
    }
    expect(response.outcome.result.overall.variance).toEqual({
      status: "undefined",
      reason: "fewerThanTwoObservations",
    });
  });
});
