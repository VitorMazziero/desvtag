// @vitest-environment node
// Operações da v0.2 no WebAssembly contra as mesmas referências independentes dos testes nativos
// (statsmodels, SciPy, scikit-posthocs e PCG32 em Python): procedimentos de comparação múltipla,
// ANOVA multifatorial com blocos, seleção de modelos e DBC aleatorizado.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type EngineResponse, type Operation, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const cases = resolve(__dirname, "../../../../../validation/cases");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/optima_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência
type Json = Record<string, any>;
const read = (path: string): Json => JSON.parse(readFileSync(join(cases, path), "utf8")) as Json;

function call(operation: unknown): Json {
  const request = {
    protocolVersion: PROTOCOL_VERSION,
    taskId: "t",
    operation: operation as Operation,
  };
  const response = JSON.parse(handleRequest(JSON.stringify(request))) as EngineResponse;
  if (response.outcome.status !== "ok") throw new Error(JSON.stringify(response.outcome));
  return response.outcome.result as unknown as Json;
}

const val = (s: Json): number => s.value as number;
const close = (got: number, want: number, rel: number, abs: number) =>
  expect(Math.abs(got - want)).toBeLessThanOrEqual(abs + rel * Math.abs(want));

function categoricalDataset(levels: string[], groups: Record<string, number[]>): Json {
  const observations: Json[] = [];
  for (const level of levels)
    for (const y of groups[level] ?? [])
      observations.push({
        id: `o${observations.length + 1}`,
        unitId: null,
        factors: [level],
        responses: [y],
      });
  return {
    factors: [{ id: "g", name: "g", kind: "categorical", unit: null, levels }],
    responses: [{ id: "y", name: "y", unit: null }],
    observations,
  };
}

describe("v0.2 operations in WebAssembly", () => {
  it("multiple comparison procedures match SciPy, statsmodels and scikit-posthocs", () => {
    for (const c of read("multiple_comparison_procedures/procedures.json").cases as Json[]) {
      const result = call({
        type: "comparisonProcedure",
        dataset: categoricalDataset(c.levels, c.groups),
        responseId: "y",
        factorId: "g",
        alpha: c.alpha,
        procedure: c.procedure,
      });
      close(val(result.globalTest.statistic), c.expected.global.statistic, 1e-9, 0);
      expect(result.pairs.length).toBe(c.expected.pairs.length);
      result.pairs.forEach((p: Json, i: number) => {
        const w = c.expected.pairs[i] as Json;
        const ref = (w.p_adjusted ?? w.p) as number;
        close(val(p.pAdjusted), ref, 1e-6, c.id.startsWith("dunnett") ? 2e-7 : 1e-8);
      });
    }
  });

  it("factorial ANOVA with blocks matches statsmodels (types I, II and III)", () => {
    for (const c of read("factorial_anova/factorial.json").cases as Json[]) {
      const names = ["A", "B", "Bloco"];
      const dataset = {
        factors: names.map((n) => ({
          id: n,
          name: n,
          kind: "categorical",
          unit: null,
          levels: c.levels[n],
        })),
        responses: [{ id: "y", name: "y", unit: null }],
        observations: (c.rows as Json[]).map((r, i) => ({
          id: `o${i + 1}`,
          unitId: null,
          factors: names.map((n) => r[n]),
          responses: [r.y],
        })),
      };
      const result = call({
        type: "anovaFactorial",
        dataset,
        responseId: "y",
        factorIds: ["A", "B"],
        blockId: c.with_block ? "Bloco" : null,
        interactionOrder: 2,
        ssType: c.ss_type,
        alpha: c.alpha,
        marginals: [],
        contrasts: [],
      });
      result.terms.forEach((t: Json, i: number) => {
        const w = c.expected.terms[i] as Json;
        expect(t.term).toBe(w.term);
        close(val(t.sumSquares), w.ss, 1e-9, 1e-10);
        close(val(t.pValue), w.p, 1e-6, 1e-12);
      });
    }
  });

  it("model selection reproduces the statsmodels backward sequence", () => {
    for (const c of read("surface_model_selection/selection.json").cases as Json[]) {
      const factors = Array.from({ length: c.k as number }, (_, i) => ({
        id: `f${i + 1}`,
        name: `x${i + 1}`,
        low: c.low[i],
        high: c.high[i],
        unit: null,
      }));
      const dataset = {
        factors: factors.map((f) => ({
          id: f.id,
          name: f.name,
          kind: "numeric",
          unit: null,
          levels: [],
        })),
        responses: [{ id: "y", name: "y", unit: null }],
        observations: (c.real as number[][]).map((row, i) => ({
          id: `o${i + 1}`,
          unitId: null,
          factors: row,
          responses: [c.y[i]],
        })),
      };
      const result = call({
        type: "surfaceSelectModel",
        dataset,
        responseId: "y",
        factors,
        terms: [],
        alpha: c.alpha,
      });
      expect(result.steps.length).toBe(c.steps.length);
      result.steps.forEach((s: Json, i: number) => {
        close(val(s.metrics.aic), c.steps[i].metrics.aic, 1e-10, 1e-8);
        close(val(s.metrics.press), c.steps[i].metrics.press, 1e-8, 1e-10);
      });
      expect(result.stoppedBecause).toBe(c.stopped);
    }
  });

  it("randomized block design uses the same order as the independent implementation", () => {
    // A semente do contrato JSON é um inteiro seguro (≤ 2^53 − 1); casos maiores só valem no nativo.
    const cases = (read("randomized_block_design/rcbd.json").cases as Json[]).filter((c) =>
      Number.isSafeInteger(c.seed),
    );
    expect(cases.length).toBeGreaterThanOrEqual(4);
    for (const c of cases) {
      const result = call({
        type: "designRcbdGenerate",
        factorId: "f1",
        factorName: "Fator",
        levels: c.levels,
        blockName: "Bloco",
        blocks: c.blocks,
        randomize: c.randomize,
        seed: c.seed,
      });
      expect(result.runs.map((r: Json) => [r.blockIndex, r.levelIndex])).toEqual(
        (c.runs as Json[]).map((r) => [r.blockIndex, r.levelIndex]),
      );
    }
  });
  it("mixed-levels design (WebAssembly) equals the independent implementation", () => {
    const cases = (read("mixed_levels_design/mixed.json").cases as Json[]).filter((c) =>
      Number.isSafeInteger(c.seed),
    );
    expect(cases.length).toBeGreaterThanOrEqual(4);
    for (const c of cases) {
      const result = call({
        type: "designMixedGenerate",
        factors: (c.factors as Json[]).map((f, i) => ({
          id: `f${i + 1}`,
          name: f.name,
          levels: f.levels,
        })),
        replicates: c.replicates,
        randomize: c.randomize,
        seed: c.seed,
      });
      expect(result.runs.map((r: Json) => [r.standardOrder, r.levelIndices, r.replicate])).toEqual(
        (c.runs as Json[]).map((r) => [r.standardOrder, r.levelIndices, r.replicate]),
      );
    }
  });
  it("optimal design (WebAssembly) reaches the known D-optimum and the exhaustive optima", () => {
    // Ótimo conhecido: o fatorial 2³ para o modelo com interações tem ln|M| = 7·ln 8.
    const factors = [1, 2, 3].map((i) => ({ id: `f${i}`, name: `X${i}`, low: 10, high: 30 }));
    const known = call({
      type: "designOptimalGenerate",
      factors,
      model: "interactions",
      criterion: "d",
      runs: 8,
      levels: 3,
      constraints: [],
      fixedRuns: [],
      starts: 12,
      randomize: false,
      seed: 7,
    });
    expect(known.metrics.logDet).toBeCloseTo(7 * Math.log(8), 9);
    const cases = read("optimal_design/optimal.json").exhaustiveCases as Json[];
    for (const c of cases) {
      const got = call({
        type: "designOptimalGenerate",
        ...c.spec,
        factors: (c.spec.factors as Json[]).map((f, i) => ({ id: `f${i + 1}`, ...f })),
      });
      const value =
        c.spec.criterion === "d" ? got.metrics.logDet : -got.metrics.iAverage / c.spec.runs;
      expect(Math.abs(value - c.expected.best)).toBeLessThan(
        1e-9 * (1 + Math.abs(c.expected.best)),
      );
    }
  });
  it("paired comparison (WebAssembly) equals SciPy", () => {
    const cases = read("paired_comparison/paired.json").cases as Json[];
    for (const c of cases) {
      const got = call({
        type: "comparisonPaired",
        first: c.first,
        second: c.second,
        alpha: 0.05,
      });
      const val = (s: Json) => (s.status === "defined" ? s.value : Number.NaN);
      expect(Math.abs(val(got.tTest.t) - c.expected.t)).toBeLessThan(
        1e-9 * (1 + Math.abs(c.expected.t)),
      );
      expect(Math.abs(val(got.tTest.pValue) - c.expected.p)).toBeLessThan(1e-9);
      expect(got.wilcoxon.method).toBe(c.expected.wilcoxon.method);
      expect(Math.abs(val(got.wilcoxon.pValue) - c.expected.wilcoxon.p)).toBeLessThan(1e-9);
    }
  });
  it("power analysis and nonlinear fit (WebAssembly) equal SciPy", () => {
    const power = read("power_analysis/power.json").cases as Json[];
    for (const c of power) {
      const goal = c.goal as Json;
      const got = call({
        type: "powerAnalyze",
        design: c.design,
        sigma: c.sigma,
        alpha: c.alpha,
        twoSided: c.twoSided,
        goal,
      });
      expect(got.n).toBe(c.expected.n);
      expect(Math.abs(got.power.value - c.expected.power)).toBeLessThan(1e-9);
    }
    const nonlinear = read("nonlinear_saturation_fit/nonlinear.json").cases as Json[];
    for (const c of nonlinear) {
      const got = call({
        type: "modelNonlinear",
        x: c.x,
        y: c.y,
        model: c.model,
        initial: null,
        lower: null,
        upper: null,
        alpha: 0.05,
      });
      expect(got.converged).toBe(true);
      (got.parameters as Json[]).forEach((p, i) => {
        const want = c.expected.estimates[i] as number;
        expect(Math.abs(p.estimate - want)).toBeLessThan(1e-5 * Math.abs(want) + 1e-8);
      });
    }
  });
});
