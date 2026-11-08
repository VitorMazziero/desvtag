// @vitest-environment node
// Paridade e validação no WebAssembly do modelo linear: os mesmos casos de
// validation/cases/linear_model (NIST StRD contra a referência exata e o construtor de modelos
// contra NumPy/SciPy), pelo mesmo protocolo JSON, com as mesmas exigências do teste nativo
// (app/crates/desvtag-core/tests/linear_model_validation.rs).
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { type EngineResponse, type LinearFit, PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases/linear_model");
const wasmFile = resolve(__dirname, "wasm/desvtag_wasm_bg.wasm");

beforeAll(() => {
  initSync({ module: readFileSync(wasmFile) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência com formatos heterogêneos
type Json = Record<string, any>;

function readJson(dir: string, file: string): Json {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as Json;
}

function buildRequest(dir: string, taskId: string) {
  const config = readJson(dir, "config.json");
  const lines = readFileSync(join(dir, "input.csv"), "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "");
  const header = (lines[0] as string).split(",");
  const responseAt = header.indexOf(config.responseColumn);
  const factorColumns = header.map((_, i) => i).filter((i) => i !== responseAt);
  const kind = (name: string) =>
    config.factors?.[name] === "categorical" ? "categorical" : "numeric";
  const factorValue = (cell: string, name: string) =>
    cell === "" ? null : kind(name) === "categorical" ? cell : Number(cell);
  return {
    protocolVersion: PROTOCOL_VERSION,
    taskId,
    operation: {
      type: "modelFitLinear",
      dataset: {
        factors: factorColumns.map((c) => ({
          id: header[c],
          name: header[c],
          kind: kind(header[c] as string),
          unit: null,
          levels: [],
        })),
        responses: [{ id: config.responseColumn, name: config.responseColumn, unit: null }],
        observations: lines.slice(1).map((line, i) => {
          const cells = line.split(",").map((c) => c.trim());
          return {
            id: `o${i + 1}`,
            unitId: null,
            factors: factorColumns.map((c) => factorValue(cells[c] as string, header[c] as string)),
            responses: [cells[responseAt] === "" ? null : Number(cells[responseAt])],
          };
        }),
      },
      spec: {
        responseId: config.responseColumn,
        intercept: config.intercept,
        terms: (config.terms as Json[]).map((t) =>
          t.type === "interaction"
            ? { type: "interaction", factorIds: t.factors }
            : t.type === "power"
              ? { type: "power", factorId: t.factor, degree: t.degree }
              : { type: "main", factorId: t.factor },
        ),
        coding: config.coding,
        confidenceLevel: config.confidenceLevel,
      },
    },
  };
}

function fitLinear(dir: string, name: string): LinearFit {
  const response = JSON.parse(
    handleRequest(JSON.stringify(buildRequest(dir, name))),
  ) as EngineResponse;
  if (response.outcome.status !== "ok" || response.outcome.result.type !== "modelFitLinear") {
    throw new Error(`${name}: ${JSON.stringify(response.outcome)}`);
  }
  return response.outcome.result as unknown as LinearFit;
}

type Stat = { status: string; value?: number };
function value(s: Stat): number {
  expect(s.status).toBe("defined");
  return s.value as number;
}

function lre(got: number, want: number, scale: number): number {
  const err = want === 0 ? Math.abs(got) / scale : Math.abs((got - want) / want);
  return err <= 1e-15 ? 15 : Math.min(-Math.log10(err), 15);
}

const all = readdirSync(casesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const nist = all.filter((n) => n.includes("-nist-"));
const builder = all.filter((n) => n.includes("-model-"));

describe("linear_model in WebAssembly vs independent references", () => {
  it("finds the cases", () => {
    expect(nist.length).toBeGreaterThanOrEqual(11);
    expect(builder.length).toBeGreaterThanOrEqual(6);
  });

  it.each(nist)("NIST %s", (name) => {
    const dir = join(casesDir, name);
    const expected = readJson(dir, "expected.json");
    const exact = expected.exactOnBinary64Inputs;
    const result = fitLinear(dir, name);
    const sst = Number(exact.ssTotal);
    const sdScale = Math.sqrt(sst / result.nObservations);
    const perfect = Number(exact.ssResidual) / sst < 1e-20;
    const min = expected.tolerances.minLre as Record<string, number | null>;

    let coefficients = 15;
    let stdErrors = 15;
    result.coefficients.forEach((row, i) => {
      coefficients = Math.min(
        coefficients,
        lre(value(row.estimate), Number(exact.coefficients[i].estimate), 1),
      );
      stdErrors = Math.min(
        stdErrors,
        lre(value(row.stdError), perfect ? 0 : Number(exact.coefficients[i].sd), sdScale),
      );
    });
    const measured: Record<string, number | null> = {
      coefficients,
      stdErrors,
      sigma: lre(value(result.residualSd), perfect ? 0 : Number(exact.residualSd), sdScale),
      rSquared: lre(value(result.anova.rSquared), Number(exact.rSquared), 1),
      ssModel: lre(value(result.anova.model.sumSquares), Number(exact.ssModel), sst),
      ssResidual: lre(
        value(result.anova.residual.sumSquares),
        perfect ? 0 : Number(exact.ssResidual),
        sst,
      ),
      f: perfect || exact.f === null ? null : lre(value(result.anova.f), Number(exact.f), 1),
    };
    for (const key of Object.keys(measured)) {
      if (min[key] === null) expect(measured[key], key).toBeNull();
      else expect(measured[key] as number, key).toBeGreaterThanOrEqual(min[key] as number);
    }
    const codes = result.issues.map((i) => i.code);
    if (name.includes("filip")) expect(codes).toContain("model.ill_conditioned");
    else expect(codes).toEqual([]);
  });

  it.each(builder)("builder %s", (name) => {
    const dir = join(casesDir, name);
    const expected = readJson(dir, "expected.json");
    const want = expected.reference;
    const tol = expected.tolerances;
    const result = fitLinear(dir, name);
    const scale = Math.max(1, ...(want.fitted as number[]).map(Math.abs));
    const close = (got: number, ref: number, s: number, what: string) =>
      expect(Math.abs(got - ref), what).toBeLessThanOrEqual(
        tol.relative * Math.abs(ref) + tol.absoluteScale * s,
      );

    expect(result.observations.map((o) => o.observationId)).toEqual(expected.usedObservations);
    expect(result.excluded.map((e) => e.observationId)).toEqual(expected.excludedObservations);
    expect(result.coefficients.map((c) => c.label)).toEqual(expected.labels);
    expect(result.rank).toBe(want.rank);
    expect(result.dfResidual).toBe(want.dfResidual);
    close(value(result.anova.residual.sumSquares), want.ssResidual, want.ssTotal, "SQE");
    close(value(result.anova.model.sumSquares), want.ssModel, want.ssTotal, "SQM");
    close(value(result.anova.rSquared), want.rSquared, 1, "R²");
    result.observations.forEach((o, i) => {
      close(o.fitted, want.fitted[i], scale, "ajustado");
      close(o.residual, want.residuals[i], scale, "resíduo");
    });
    if (want.f !== undefined) {
      close(value(result.anova.f), want.f, 1, "F");
      close(value(result.anova.pValue), want.fP, 1, "p do F");
    }
    if (want.coefficients) {
      result.coefficients.forEach((row, i) => {
        const w = want.coefficients[i];
        close(value(row.estimate), w.estimate, scale, "estimativa");
        close(value(row.stdError), w.stdError, scale, "EP");
        close(value(row.tValue), w.t, 1, "t");
        close(value(row.pValue), w.p, 1, "p");
        close(value(row.ciLower), w.ciLower, scale, "IC inf");
        close(value(row.ciUpper), w.ciUpper, scale, "IC sup");
      });
      result.observations.forEach((o, i) => {
        close(o.leverage, want.leverage[i], 1, "alavancagem");
        close(value(o.standardizedResidual), want.standardized[i], 1, "padronizado");
        if (want.studentized)
          close(value(o.studentizedResidual), want.studentized[i], 1, "studentizado");
        close(value(o.cooksDistance), want.cook[i], 1, "Cook");
      });
    }
  });
});
