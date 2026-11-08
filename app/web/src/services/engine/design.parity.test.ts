// @vitest-environment node
// Planejamentos de dois níveis no WebAssembly: as mesmas matrizes (enumeração independente em
// Python, PCG32 reimplementado) e análises (NumPy/SciPy) do teste nativo
// (app/crates/desvtag-core/tests/design_validation.rs), pelo protocolo JSON. A igualdade exata das
// ordens aleatórias entre Python, Rust nativo e WebAssembly é a verificação de que a mesma semente
// produz a mesma ordem de execução nos dois alvos.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type DesignAnalysisResult,
  type EngineResponse,
  type GeneratedDesign,
  PROTOCOL_VERSION,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência com formatos heterogêneos
type Json = Record<string, any>;
const readJson = (path: string): Json => JSON.parse(readFileSync(path, "utf8")) as Json;

function run(operation: unknown): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId: "d", operation })),
  ) as EngineResponse;
}

function specOf(c: Json): Json {
  const k = c.k as number;
  return {
    kind:
      c.kind === "full"
        ? { type: "fullFactorial" }
        : c.kind === "fractional"
          ? { type: "fractional", generators: c.gens }
          : { type: "plackettBurman", runs: c.runs },
    factors: Array.from({ length: k }, (_, i) => ({
      id: `f${i + 1}`,
      name: `F${i + 1}`,
      low: 10 * (i + 1),
      high: 10 * (i + 1) + 8,
      unit: null,
    })),
    replicates: c.replicates,
    centerPoints: c.centers,
    randomize: c.randomize,
    // A semente é um inteiro de 64 bits; os casos de referência cabem em 2^53.
    seed: c.seed,
  };
}

describe("two-level designs in WebAssembly", () => {
  it("generates the same runs, in the same random order, as the independent enumeration", () => {
    const cases = readJson(join(casesDir, "two_level_design/designs.json")).cases as Json[];
    for (const c of cases) {
      const response = run({ type: "designGenerate", ...specOf(c) });
      if (response.outcome.status !== "ok" || response.outcome.result.type !== "designGenerate")
        throw new Error(JSON.stringify(response.outcome));
      const design = response.outcome.result as unknown as GeneratedDesign;
      expect(design.runs.length).toBe(c.runsList.length);
      design.runs.forEach((r, i) => {
        const w = c.runsList[i];
        expect([r.run, r.standardOrder, r.replicate]).toEqual([
          w.run,
          w.standardOrder,
          w.replicate,
        ]);
        expect(r.point === "center").toBe(w.point === "center");
        expect(r.coded).toEqual(w.coded);
      });
    }
  });

  it("reports the defining relation, resolution and aliases of fractional designs", () => {
    const cases = readJson(join(casesDir, "two_level_design/fractional.json")).cases as Json[];
    for (const c of cases) {
      const spec = specOf({
        kind: "fractional",
        k: c.k,
        gens: c.generators,
        replicates: 1,
        centers: 0,
        randomize: false,
        seed: 1,
      });
      const response = run({ type: "designGenerate", ...spec });
      if (response.outcome.status !== "ok" || response.outcome.result.type !== "designGenerate")
        throw new Error(JSON.stringify(response.outcome));
      const design = response.outcome.result as unknown as GeneratedDesign;
      expect(design.resolution).toBe(c.resolution);
      expect(design.definingRelation).toEqual(c.definingRelation);
      for (const row of design.aliases) {
        expect([...row.aliases].sort()).toEqual([...c.aliases[row.effect]].sort());
      }
    }
  });

  it("refuses unsupported sizes and generators with coded issues", () => {
    const base = specOf({
      kind: "pb",
      k: 5,
      runs: 28,
      replicates: 1,
      centers: 0,
      randomize: false,
      seed: 1,
    });
    const response = run({ type: "designGenerate", ...base });
    expect(response.outcome.status).toBe("error");
    if (response.outcome.status === "error")
      expect(response.outcome.error.issues[0]?.code).toBe("design.unsupported_runs");
  });

  const analysisDirs = [
    "001-fatorial-2x3-replicas-centrais",
    "002-fracionario-resolucao-iv",
    "003-plackett-burman-12-fatores-oito",
    "004-saturado-lenth",
    "005-fatorial-2x4-sem-replica-erro-por-interacao",
  ];
  it.each(analysisDirs)("analysis %s", (name) => {
    const dir = join(casesDir, "two_level_design_analysis", name);
    const config = readJson(join(dir, "config.json"));
    const want = readJson(join(dir, "expected.json")).reference as Json;
    const lines = readFileSync(join(dir, "input.csv"), "utf8").trim().split("\n");
    const header = (lines[0] as string).split(",");
    const k = config.spec.factors.length as number;
    const response = run({
      type: "designAnalyze",
      dataset: {
        factors: header
          .slice(0, k)
          .map((n, i) => ({ id: `f${i + 1}`, name: n, kind: "numeric", unit: null, levels: [] })),
        responses: [{ id: "y", name: "y", unit: null }],
        observations: lines.slice(1).map((line, r) => {
          const cells = line.split(",").map(Number);
          return {
            id: `o${r + 1}`,
            unitId: null,
            factors: cells.slice(0, k),
            responses: [cells[k]],
          };
        }),
      },
      responseId: "y",
      spec: config.spec,
      terms: (config.terms as string[]).map((t) =>
        t.length === 1
          ? { type: "main", factorId: `f${t.charCodeAt(0) - 64}` }
          : { type: "interaction", factorIds: [...t].map((c) => `f${c.charCodeAt(0) - 64}`) },
      ),
      alpha: config.alpha,
      includeCurvature: config.includeCurvature,
    });
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "designAnalyze")
      throw new Error(`${name}: ${JSON.stringify(response.outcome)}`);
    const r = response.outcome.result as unknown as DesignAnalysisResult;
    expect(r.fit.rank).toBe(want.rank);
    expect(r.fit.dfResidual).toBe(want.dfResidual);
    const close = (got: number, ref: number, what: string) =>
      expect(Math.abs(got - ref), what).toBeLessThanOrEqual(1e-9 * Math.abs(ref) + 1e-12 * 100);
    for (const [i, o] of r.fit.observations.entries()) close(o.fitted, want.fitted[i], "ajustado");
    if (!want.estimable) {
      expect(r.effects.filter((e) => e.effect.status !== "defined").length).toBe(
        want.aliasedColumns,
      );
      return;
    }
    r.effects.forEach((e, i) => {
      const w = want.coefficients[i + 1];
      expect(e.effect.status).toBe("defined");
      close((e.effect as { value: number }).value, w.effect, `${e.label} efeito`);
      if (w.p !== undefined) {
        close((e.pValue as { value: number }).value, w.p, `${e.label} p`);
        close((e.tValue as { value: number }).value, w.t, `${e.label} t`);
      } else {
        expect(e.pValue.status).toBe("undefined");
      }
    });
    if (want.lenth) {
      close((r.lenth as NonNullable<typeof r.lenth>).pse, want.lenth.pse, "PSE");
      close((r.lenth as NonNullable<typeof r.lenth>).marginOfError, want.lenth.marginOfError, "ME");
    }
    if (want.lackOfFit?.p !== undefined)
      close(
        ((r.lackOfFit as NonNullable<typeof r.lackOfFit>).pValue as { value: number }).value,
        want.lackOfFit.p,
        "p da falta de ajuste",
      );
  });
});
