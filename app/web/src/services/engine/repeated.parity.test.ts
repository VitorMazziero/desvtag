// @vitest-environment node
// The same independent dense references used by native Rust, dispatched through actual WASM.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it } from "vitest";
import {
  type EngineResponse,
  type MixedModelRequest,
  type MixedModelResult,
  PROTOCOL_VERSION,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

type Expected = {
  nll: number;
  beta: number[];
  fixedCovariance: number[];
  termTest?: { f: number; denominatorDf: number; pValue: number };
  termTests?: { f: number; df: number; pValue: number }[];
  means: { estimate: number; df: number }[];
  comparisons: { adjustedPValue: number }[];
};
type Case = {
  name: string;
  request?: MixedModelRequest;
  structure?: string;
  times?: number[];
  rows?: { unit: string; y: number }[];
  expected: Expected;
};
const root = resolve(__dirname, "../../../../../validation/cases/repeated_covariance");
beforeAll(() =>
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) }),
);
function call(request: MixedModelRequest): MixedModelResult {
  const response = JSON.parse(
    handleRequest(
      JSON.stringify({
        protocolVersion: PROTOCOL_VERSION,
        taskId: "repeated-parity",
        operation: { type: "modelMixed", ...request },
      }),
    ),
  ) as EngineResponse;
  if (response.outcome.status !== "ok" || response.outcome.result.type !== "modelMixed")
    throw new Error(JSON.stringify(response));
  return response.outcome.result;
}
function request(c: Case): MixedModelRequest {
  if (c.request) return c.request;
  return {
    dataset: {
      factors: [],
      responses: [{ id: "y", name: "Response", unit: null }],
      observations: (c.rows ?? []).map((r, i) => ({
        id: `o${i + 1}`,
        unitId: r.unit,
        factors: [],
        responses: [r.y],
      })),
    },
    spec: {
      responseId: "y",
      intercept: true,
      terms: [],
      coding: "treatment",
      confidenceLevel: 0.95,
    },
    advanced: {
      covariance:
        c.structure === "cs" ? "compoundSymmetry" : c.structure === "ar1" ? "ar1" : "unstructured",
      times: c.times,
      timeLabels: [],
      timeEffect: "categorical",
      marginalFactors: [],
      marginalTime: true,
      adjustment: "bonferroni",
      references: [],
    },
  };
}
function close(got: number, want: number, rel = 0.003) {
  expect(Math.abs(got - want)).toBeLessThanOrEqual(1e-7 + rel * Math.abs(want));
}
for (const file of ["reml.json", "factorial.json"])
  it(`advanced repeated WASM matches dense references in ${file}`, () => {
    const cases = JSON.parse(readFileSync(resolve(root, file), "utf8")) as { cases: Case[] };
    for (const c of cases.cases) {
      const result = call(request(c));
      const extra = result.advanced;
      expect(extra).toBeDefined();
      if (!extra) throw new Error("Missing advanced result");
      expect(result.provenance.methodVersion).toBe(2);
      close(extra.remlLogLikelihood, -c.expected.nll, 1e-9);
      expect(result.coefficients).toHaveLength(c.expected.beta.length);
      result.coefficients.forEach((value, i) => {
        close(value.estimate, c.expected.beta[i]!, 1e-5);
      });
      expect(extra.fixedCovariance).toHaveLength(c.expected.fixedCovariance.length);
      extra.fixedCovariance.forEach((value, index) => {
        expect(Math.abs(value - c.expected.fixedCovariance[index]!)).toBeLessThanOrEqual(3e-5);
      });
      const tests = c.expected.termTests ?? (c.expected.termTest ? [c.expected.termTest] : []);
      expect(extra.termTests).toHaveLength(tests.length);
      extra.termTests.forEach((value, index) => {
        const expected = tests[index];
        if (
          !expected ||
          value.fValue.status !== "defined" ||
          value.denominatorDf.status !== "defined" ||
          value.pValue.status !== "defined"
        )
          throw new Error("Missing joint inference");
        close(value.fValue.value, expected.f, 3e-5);
        close(
          value.denominatorDf.value,
          "denominatorDf" in expected ? expected.denominatorDf : expected.df,
        );
        close(value.pValue.value, expected.pValue);
      });
      expect(extra.marginalMeans).toHaveLength(c.expected.means.length);
      extra.marginalMeans.forEach((value, i) => {
        close(value.inference.estimate, c.expected.means[i]!.estimate, 1e-5);
        if (value.inference.df.status !== "defined") throw new Error("Undefined df");
        close(value.inference.df.value, c.expected.means[i]!.df);
      });
      expect(extra.comparisons).toHaveLength(c.expected.comparisons.length);
      extra.comparisons.forEach((value, i) => {
        if (value.adjustedPValue.status !== "defined") throw new Error("Undefined adjusted p");
        close(value.adjustedPValue.value, c.expected.comparisons[i]!.adjustedPValue);
      });
    }
  });
