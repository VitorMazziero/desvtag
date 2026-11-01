// @vitest-environment node
// Comparação de um fator no WebAssembly: os mesmos casos de validation/cases/one_way_comparison
// (NIST StRD de ANOVA contra a referência exata; casos aplicados contra SciPy/NumPy/cliques),
// pelo protocolo JSON, com as mesmas exigências do teste nativo
// (app/crates/optima-core/tests/comparison_validation.rs). Também confere pontos da amplitude
// studentizada contra o SciPy.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type EngineResponse, type OneWayResult, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases/one_way_comparison");
const srFile = resolve(
  __dirname,
  "../../../../../validation/cases/studentized_range/001-grade-scipy-mpmath/expected.json",
);

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/optima_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência com formatos heterogêneos
type Json = Record<string, any>;
const readJson = (dir: string, file: string): Json =>
  JSON.parse(readFileSync(join(dir, file), "utf8")) as Json;

function run(operation: unknown, taskId: string): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId, operation })),
  ) as EngineResponse;
}

function compare(dir: string, name: string): OneWayResult {
  const config = readJson(dir, "config.json");
  const lines = readFileSync(join(dir, "input.csv"), "utf8")
    .split("\n")
    .slice(1)
    .filter((l) => l.trim() !== "");
  const response = run(
    {
      type: "comparisonOneWay",
      dataset: {
        factors: [
          {
            id: "treatment",
            name: "treatment",
            kind: "categorical",
            unit: null,
            levels: config.levels ?? [],
          },
        ],
        responses: [{ id: "y", name: "y", unit: null }],
        observations: lines.map((line, i) => {
          const cut = line.lastIndexOf(",");
          const value = line.slice(cut + 1).trim();
          return {
            id: `o${i + 1}`,
            unitId: null,
            factors: [line.slice(0, cut)],
            responses: [value === "" ? null : Number(value)],
          };
        }),
      },
      responseId: "y",
      factorId: "treatment",
      alpha: config.alpha,
    },
    name,
  );
  if (response.outcome.status !== "ok" || response.outcome.result.type !== "comparisonOneWay") {
    throw new Error(`${name}: ${JSON.stringify(response.outcome)}`);
  }
  return response.outcome.result as unknown as OneWayResult;
}

type Stat = { status: string; value?: number };
const value = (s: Stat): number => {
  expect(s.status).toBe("defined");
  return s.value as number;
};
const lre = (got: number, want: number) => {
  const err = Math.abs((got - want) / want);
  return err <= 1e-15 ? 15 : Math.min(-Math.log10(err), 15);
};

const all = readdirSync(casesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const nist = all.filter((n) => n.includes("-nist-"));
const applied = all.filter((n) => /^1\d\d-/.test(n));

describe("one_way_comparison in WebAssembly vs independent references", () => {
  it("finds the cases", () => {
    expect(nist.length).toBeGreaterThanOrEqual(11);
    expect(applied.length).toBeGreaterThanOrEqual(4);
  });

  it.each(nist)("NIST %s", (name) => {
    const dir = join(casesDir, name);
    const expected = readJson(dir, "expected.json");
    const exact = expected.exactOnBinary64Inputs;
    const result = compare(dir, name);
    const min = expected.tolerances.minLre as Record<string, number>;
    const measured: Record<string, number> = {
      ssBetween: lre(value(result.anova.between.sumSquares), Number(exact.ssBetween)),
      ssWithin: lre(value(result.anova.within.sumSquares), Number(exact.ssWithin)),
      f: lre(value(result.anova.f), Number(exact.f)),
      rSquared: lre(value(result.effectSizes.etaSquared), Number(exact.rSquared)),
      residualSd: lre(Math.sqrt(value(result.anova.within.meanSquare)), Number(exact.residualSd)),
    };
    for (const key of Object.keys(min))
      expect(measured[key] as number, key).toBeGreaterThanOrEqual(min[key] as number);
  });

  it.each(applied)("applied %s", (name) => {
    const dir = join(casesDir, name);
    const want = readJson(dir, "expected.json");
    const tol = want.tolerances;
    const result = compare(dir, name);
    const scale = Math.max(1, ...(want.means as number[]).map(Math.abs));
    const close = (got: number, ref: number, s: number, what: string) =>
      expect(Math.abs(got - ref), what).toBeLessThanOrEqual(
        tol.relative * Math.abs(ref) + tol.absoluteScale * s,
      );

    result.groups.forEach((g, i) => {
      expect(g.label).toBe(want.levels[i]);
      expect(g.n).toBe(want.sizes[i]);
      close(value(g.mean), want.means[i], scale, "média");
      close(value(g.ciLower), want.ciPooled[i][0], scale, "IC inf");
      close(value(g.ciUpper), want.ciPooled[i][1], scale, "IC sup");
      const b = g.boxplot as NonNullable<typeof g.boxplot>;
      const w = want.boxplots[i];
      for (const [got, key] of [
        [b.q1, "q1"],
        [b.median, "median"],
        [b.q3, "q3"],
        [b.whiskerLow, "whiskerLow"],
        [b.whiskerHigh, "whiskerHigh"],
      ] as const) {
        close(got, w[key], scale, key);
      }
      expect(b.outliers.map((o) => o.value).sort((x, y) => x - y)).toEqual(w.outliers);
    });
    close(value(result.anova.f), want.anova.f, 1, "F");
    close(value(result.anova.pValue), want.anova.p, 1, "p");
    close(value(result.effectSizes.omegaSquared), want.effect.omegaSquared, 1, "ω²");
    close(value(result.diagnostics.brownForsythe.pValue), want.brownForsythe.p, 1, "BF p");
    expect(result.diagnostics.qq.length).toBe(want.qq.length);
    const tukey = result.tukey as NonNullable<typeof result.tukey>;
    tukey.comparisons.forEach((c, i) => {
      const w = want.tukey.pairs[i];
      expect(Math.abs(value(c.pAdjusted) - w.pAdjusted)).toBeLessThanOrEqual(tol.pAbsolute);
      close(value(c.ciLower), w.ciLower, scale, "IC simultâneo inf");
      close(value(c.ciUpper), w.ciUpper, scale, "IC simultâneo sup");
      expect(c.significant).toBe(w.significant);
    });
    expect((result.letters as NonNullable<typeof result.letters>).letters).toEqual(want.letters);
  });

  it("studentized range points (finite df) agree with SciPy", () => {
    const grid = JSON.parse(readFileSync(srFile, "utf8")) as Json;
    const tol = grid.tolerances.absolute as number;
    const points = (grid.points as Json[]).filter((p) => p.df !== "inf" && p.level >= 0.01);
    expect(points.length).toBeGreaterThan(100);
    const sample = points.filter((_, i) => i % 5 === 0);
    for (const p of sample) {
      const response = run(
        {
          type: "distributionEvaluate",
          distribution: { type: "studentizedRange", groups: p.k, df: Number(p.df) },
          function: "sf",
          values: [Number(p.q)],
        },
        "sr",
      );
      if (
        response.outcome.status !== "ok" ||
        response.outcome.result.type !== "distributionEvaluate"
      )
        throw new Error("falha");
      const got = value(response.outcome.result.values[0] as Stat);
      expect(Math.abs(got - Number(p.sf)), `k=${p.k} df=${p.df}`).toBeLessThanOrEqual(tol);
    }
  });
});
