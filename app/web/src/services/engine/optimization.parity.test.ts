// @vitest-environment node
// Otimização por desejabilidade no WebAssembly: os mesmos casos do teste nativo
// (app/crates/desvtag-core/tests/optimization_validation.rs), pelo protocolo JSON. O melhor `D` do
// motor deve ser ao menos o da busca exaustiva independente e as sondagens (previsões, intervalos e
// desejabilidades) devem coincidir com o NumPy.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type EngineResponse,
  type OptimizationResult,
  PROTOCOL_VERSION,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases/desirability_optimization");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência com formatos heterogêneos
type Json = Record<string, any>;
const readJson = (path: string): Json => JSON.parse(readFileSync(path, "utf8")) as Json;

function run(operation: unknown): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId: "o", operation })),
  ) as EngineResponse;
}

const termOf = (code: string) => {
  const ids = [...code].map((c) => `f${c.charCodeAt(0) - 64}`);
  return ids.length === 1
    ? { type: "main", factorId: ids[0] }
    : ids[0] === ids[1]
      ? { type: "power", factorId: ids[0], degree: 2 }
      : { type: "interaction", factorIds: ids };
};

function requestOf(name: string): { request: Json; expected: Json; config: Json } {
  const dir = join(casesDir, name);
  const config = readJson(join(dir, "config.json"));
  const expected = readJson(join(dir, "expected.json")).reference as Json;
  const lines = readFileSync(join(dir, "input.csv"), "utf8").trim().split("\n");
  const k = config.factors.length as number;
  const responses = config.responses as Json[];
  return {
    config,
    expected,
    request: {
      dataset: {
        factors: config.factors.map((f: Json) => ({
          id: f.id,
          name: f.name,
          kind: "numeric",
          unit: null,
          levels: [],
        })),
        responses: responses.map((r) => ({ id: r.id, name: r.id.toUpperCase(), unit: null })),
        observations: lines.slice(1).map((line, i) => {
          const cells = line.split(",").map(Number);
          return {
            id: `o${i + 1}`,
            unitId: null,
            factors: cells.slice(0, k),
            responses: cells.slice(k),
          };
        }),
      },
      factors: config.factors.map((f: Json) => ({ ...f, unit: null })),
      setup: {
        responses: responses.map((r) => ({
          responseId: r.id,
          terms: (r.terms as string[]).map(termOf),
          goal: r.goal,
          importance: r.importance,
        })),
        limits: responses
          .filter((r) => r.limit.min !== null || r.limit.max !== null)
          .map((r) => ({ responseId: r.id, min: r.limit.min, max: r.limit.max })),
        domain: { type: "region" },
        search: {
          starts: config.starts,
          seed: config.seed,
          maxCandidates: 5,
          clusterTolerance: 0.05,
        },
        alpha: config.alpha,
      },
    },
  };
}

const names = readdirSync(casesDir)
  .filter((n) => /^\d{3}-/.test(n))
  .sort();

describe("desirability optimization in WebAssembly", () => {
  it("has the six reference cases", () => expect(names.length).toBe(6));

  it.each(names)("search vs exhaustive grid and probes: %s", (name) => {
    const { request, expected } = requestOf(name);
    const response = run({ type: "optimizationRun", ...request });
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "optimizationRun")
      throw new Error(`${name}: ${JSON.stringify(response.outcome)}`);
    const result = response.outcome.result as unknown as OptimizationResult;
    expect(result.status).toBe(expected.status);
    if (expected.status === "found") {
      const best = result.candidates[0];
      expect(best?.globalDesirability).toBeGreaterThanOrEqual(expected.bestD - 1e-9);
      expect(best?.globalDesirability).toBeLessThanOrEqual(expected.bestD + 5e-3);
    }
    if (expected.status === "infeasible") expect(result.candidates.length).toBe(0);

    const center = request.factors.map((f: Json) => (f.low + f.high) / 2);
    const half = request.factors.map((f: Json) => (f.high - f.low) / 2);
    const probes = expected.probes as Json[];
    const evaluated = run({
      type: "optimizationEvaluate",
      optimization: request,
      points: probes.map((p) => (p.coded as number[]).map((c, j) => center[j] + c * half[j])),
    });
    if (
      evaluated.outcome.status !== "ok" ||
      evaluated.outcome.result.type !== "optimizationEvaluate"
    )
      throw new Error(`${name}: ${JSON.stringify(evaluated.outcome)}`);
    const points = (
      evaluated.outcome.result as unknown as { points: OptimizationResult["candidates"] }
    ).points;
    probes.forEach((probe, i) => {
      const got = points[i];
      expect(Math.abs((got?.globalDesirability ?? 9) - probe.global)).toBeLessThan(1e-9);
      expect(got?.extrapolated).toBe(probe.extrapolated);
      (probe.responses as Json[]).forEach((w, r) => {
        const fitted = got?.predictions[r]?.prediction.fitted;
        if (fitted?.status !== "defined") throw new Error("sem previsão");
        expect(Math.abs(fitted.value - w.fitted)).toBeLessThanOrEqual(
          1e-8 * Math.abs(w.fitted) + 1e-9,
        );
      });
    });
  });

  it("gives the same candidates for the same seed (same engine, same platform path)", () => {
    const { request } = requestOf("002-duas-respostas-conflito");
    const a = run({ type: "optimizationRun", ...request });
    const b = run({ type: "optimizationRun", ...request });
    expect(JSON.stringify(a.outcome)).toBe(JSON.stringify(b.outcome));
  });
});
