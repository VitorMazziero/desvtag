// @vitest-environment node
// Composto central, Box–Behnken e superfície de resposta no WebAssembly: as mesmas matrizes
// (enumeração independente em Python) e análises (NumPy/SciPy) do teste nativo
// (app/crates/optima-core/tests/surface_validation.rs), pelo protocolo JSON.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type EngineResponse,
  type GeneratedDesign,
  PROTOCOL_VERSION,
  type SurfaceGrid,
  type SurfaceResult,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/optima_wasm.js";

const casesDir = resolve(__dirname, "../../../../../validation/cases");

beforeAll(() => {
  initSync({ module: readFileSync(resolve(__dirname, "wasm/optima_wasm_bg.wasm")) });
});

// biome-ignore lint/suspicious/noExplicitAny: arquivos JSON de referência com formatos heterogêneos
type Json = Record<string, any>;
const readJson = (path: string): Json => JSON.parse(readFileSync(path, "utf8")) as Json;

function run(operation: unknown): EngineResponse {
  return JSON.parse(
    handleRequest(JSON.stringify({ protocolVersion: PROTOCOL_VERSION, taskId: "s", operation })),
  ) as EngineResponse;
}

describe("surface designs in WebAssembly", () => {
  it("generates the same CCD and Box–Behnken matrices as the independent enumeration", () => {
    const cases = readJson(join(casesDir, "surface_design/designs.json")).cases as Json[];
    for (const c of cases) {
      const k = c.k as number;
      const kind =
        c.kind === "boxBehnken"
          ? { type: "boxBehnken" }
          : {
              type: "centralComposite",
              axial:
                c.axial === "rotatable"
                  ? { type: "rotatable" }
                  : c.axial === "face"
                    ? { type: "faceCentered" }
                    : { type: "custom", alpha: c.alpha },
              inscribed: c.inscribed,
              generators: [],
            };
      const response = run({
        type: "designGenerate",
        kind,
        factors: Array.from({ length: k }, (_, i) => ({
          id: `f${i + 1}`,
          name: `F${i + 1}`,
          low: 10 * (i + 1),
          high: 10 * (i + 1) + 8,
          unit: null,
        })),
        replicates: 1,
        centerPoints: 0,
        randomize: false,
        seed: 1,
      });
      if (response.outcome.status !== "ok" || response.outcome.result.type !== "designGenerate")
        throw new Error(JSON.stringify(response.outcome));
      const design = response.outcome.result as unknown as GeneratedDesign;
      expect(design.runs.length).toBe(c.rows.length);
      design.runs.forEach((r, i) => {
        for (const [j, v] of r.coded.entries())
          expect(Math.abs(v - c.rows[i][j])).toBeLessThan(1e-12);
      });
      if (c.alpha !== null) expect(design.axialDistance).toBeCloseTo(c.alpha, 12);
    }
  });
});

describe("response surface in WebAssembly", () => {
  const names = [
    "001-ccd-rotacional-2-fatores",
    "002-fcd-3-fatores",
    "003-box-behnken-3-fatores",
    "004-personalizado-3-fatores",
    "005-hierarquia-incompleta",
    "006-sem-erro-puro",
  ];
  const termOf = (code: string) => {
    const ids = [...code].map((c) => `f${c.charCodeAt(0) - 64}`);
    return ids.length === 1
      ? { type: "main", factorId: ids[0] }
      : ids[0] === ids[1]
        ? { type: "power", factorId: ids[0], degree: 2 }
        : { type: "interaction", factorIds: ids };
  };
  it.each(names)("analysis and grid %s", (name) => {
    const dir = join(casesDir, "response_surface", name);
    const config = readJson(join(dir, "config.json"));
    const want = readJson(join(dir, "expected.json")).reference as Json;
    const lines = readFileSync(join(dir, "input.csv"), "utf8").trim().split("\n");
    const k = config.factors.length as number;
    const surface = {
      dataset: {
        factors: config.factors.map((f: Json) => ({
          id: f.id,
          name: f.name,
          kind: "numeric",
          unit: null,
          levels: [],
        })),
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
      factors: config.factors.map((f: Json) => ({ ...f, unit: null })),
      terms: (config.terms as string[]).map(termOf),
      alpha: config.alpha,
    };
    const response = run({ type: "surfaceAnalyze", ...surface });
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "surfaceAnalyze")
      throw new Error(`${name}: ${JSON.stringify(response.outcome)}`);
    const r = response.outcome.result as unknown as SurfaceResult;
    const close = (got: number, ref: number, what: string) =>
      expect(Math.abs(got - ref), what).toBeLessThanOrEqual(1e-8 * Math.abs(ref) + 1e-9 * 1000);
    const rows = [r.intercept, ...r.terms];
    rows.forEach((row, i) => {
      const w = want.coefficients[i];
      close((row.estimate as { value: number }).value, w.coefficient, `${name} b${i}`);
      close((row.pValue as { value: number }).value, w.p, `${name} p${i}`);
    });
    close((r.anova.rSquared as { value: number }).value, want.anova.r2, `${name} R²`);
    expect(r.lackOfFit === null).toBe(want.lackOfFit === null);
    if (r.lackOfFit && want.lackOfFit)
      close((r.lackOfFit.f as { value: number }).value, want.lackOfFit.f, `${name} F falta`);
    expect(r.hierarchyGaps).toEqual(want.hierarchyGaps);

    const axes = config.gridAxes as number[];
    const gridResponse = run({
      type: "surfaceGrid",
      surface,
      xFactor: `f${(axes[0] as number) + 1}`,
      yFactor: `f${(axes[1] as number) + 1}`,
      fixed: [],
      stepsX: 5,
      stepsY: 5,
      contourLevels: 6,
    });
    if (gridResponse.outcome.status !== "ok" || gridResponse.outcome.result.type !== "surfaceGrid")
      throw new Error(`${name}: ${JSON.stringify(gridResponse.outcome)}`);
    const grid = gridResponse.outcome.result as unknown as SurfaceGrid;
    for (const [iy, row] of (want.grid as Json[][]).entries()) {
      for (const [ix, cell] of row.entries()) {
        const z = grid.z[iy]?.[ix];
        if (z?.status !== "defined") throw new Error(`${name}: z[${iy}][${ix}] indefinida`);
        close(z.value, cell.z, `${name} z[${iy}][${ix}]`);
        expect(grid.extrapolated[iy]?.[ix]).toBe(cell.extrapolated);
      }
    }
  });
});
