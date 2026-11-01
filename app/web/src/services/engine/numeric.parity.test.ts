// @vitest-environment node
// Distribuições no WebAssembly: os mesmos pontos de referência (mpmath, 60 dígitos) e as mesmas
// tolerâncias do teste nativo (app/crates/optima-core/tests/distributions_validation.rs), pelo
// protocolo JSON da operação `distributionEvaluate`.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type Distribution,
  type DistributionFunction,
  type EngineResponse,
  PROTOCOL_VERSION,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases/distributions");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/optima_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: pontos de referência com campos distintos por distribuição
type Point = Record<string, any>;

function load(name: string): Record<string, Point[]> & { tolerances: Record<string, number> } {
  return JSON.parse(readFileSync(join(casesDir, name, "expected.json"), "utf8"));
}

function evaluate(
  distribution: Distribution,
  fn: DistributionFunction,
  value: number,
): number | string {
  const request = {
    protocolVersion: PROTOCOL_VERSION,
    taskId: "d",
    operation: { type: "distributionEvaluate", distribution, function: fn, values: [value] },
  };
  const response = JSON.parse(handleRequest(JSON.stringify(request))) as EngineResponse;
  if (response.outcome.status !== "ok" || response.outcome.result.type !== "distributionEvaluate") {
    throw new Error(JSON.stringify(response.outcome));
  }
  const stat = response.outcome.result.values[0];
  return stat?.status === "defined" ? stat.value : `undefined:${stat?.status}`;
}

function worstError(
  points: Point[],
  distribution: (p: Point) => Distribution,
  fn: DistributionFunction,
  arg: string,
): number {
  let worst = 0;
  for (const p of points) {
    const want = Number(p.value);
    const got = evaluate(distribution(p), fn, Number(p[arg]));
    expect(typeof got, `${JSON.stringify(p)}`).toBe("number");
    const err = want === 0 ? Math.abs(got as number) : Math.abs(((got as number) - want) / want);
    worst = Math.max(worst, err);
  }
  return worst;
}

describe("distributions in WebAssembly vs mpmath", () => {
  it("normal", () => {
    const c = load("001-normal");
    const d = () => ({ type: "normal" }) as Distribution;
    expect(worstError(c.cdf as Point[], d, "cdf", "x")).toBeLessThanOrEqual(
      c.tolerances.cdf_sf_relative as number,
    );
    expect(worstError(c.sf as Point[], d, "sf", "x")).toBeLessThanOrEqual(
      c.tolerances.cdf_sf_relative as number,
    );
    expect(worstError(c.quantile_upper as Point[], d, "quantileUpper", "q")).toBeLessThanOrEqual(
      c.tolerances.quantile_relative as number,
    );
  });

  it("student t (df < 1e5 and df >= 1e5 with their documented tolerances)", () => {
    const c = load("002-student-t");
    const d = (p: Point) => ({ type: "studentT", df: Number(p.df) }) as Distribution;
    for (const [group, fn, arg, key] of [
      ["sf", "sf", "t", "sf_relative"],
      ["quantile_upper", "quantileUpper", "q", "quantile_relative"],
    ] as const) {
      for (const large of [false, true]) {
        const points = (c[group] as Point[]).filter((p) => Number(p.df) >= 1e5 === large);
        const tolerance = c.tolerances[large ? `${key}_df_above_1e5` : key] as number;
        expect(points.length).toBeGreaterThan(0);
        expect(worstError(points, d, fn, arg), `${group} large=${large}`).toBeLessThanOrEqual(
          tolerance,
        );
      }
    }
  });

  it("chi-square", () => {
    const c = load("003-chi-square");
    const d = (p: Point) => ({ type: "chiSquare", df: Number(p.df) }) as Distribution;
    const t = c.tolerances;
    expect(worstError(c.cdf as Point[], d, "cdf", "x")).toBeLessThanOrEqual(
      t.cdf_sf_relative as number,
    );
    expect(worstError(c.sf as Point[], d, "sf", "x")).toBeLessThanOrEqual(
      t.cdf_sf_relative as number,
    );
    expect(worstError(c.quantile_upper as Point[], d, "quantileUpper", "q")).toBeLessThanOrEqual(
      t.quantile_relative as number,
    );
    expect(worstError(c.quantile_lower as Point[], d, "quantileLower", "p")).toBeLessThanOrEqual(
      t.quantile_relative as number,
    );
  });

  it("F", () => {
    const c = load("004-f");
    const d = (p: Point) => ({ type: "f", df1: Number(p.d1), df2: Number(p.d2) }) as Distribution;
    const t = c.tolerances;
    expect(worstError(c.cdf as Point[], d, "cdf", "x")).toBeLessThanOrEqual(
      t.cdf_sf_relative as number,
    );
    expect(worstError(c.sf as Point[], d, "sf", "x")).toBeLessThanOrEqual(
      t.cdf_sf_relative as number,
    );
    expect(worstError(c.quantile_upper as Point[], d, "quantileUpper", "q")).toBeLessThanOrEqual(
      t.quantile_relative as number,
    );
  });

  it("out-of-domain arguments are explicit states", () => {
    expect(evaluate({ type: "normal" }, "quantileLower", 1.5)).toBe("undefined:undefined");
  });
});
