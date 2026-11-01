import { describe, expect, it } from "vitest";
import type { Evaluation } from "../../services/engine";
import { newExperiment } from "../../state/project";
import { createWorkspace, workspaceReducer } from "../../state/workspace";
import {
  confirmationPlan,
  confirmationRows,
  defaultGoal,
  defaultSetup,
  observedRange,
  roundedReal,
} from "./optimizationSetup";

const T0 = "2026-11-01T10:00:00.000Z";

function sample() {
  let ws = createWorkspace("p", "Projeto", "Experimento 1", T0);
  for (const action of [
    { type: "addFactor" },
    { type: "updateFactor", id: "f1", patch: { name: "A", kind: "numeric" } },
    { type: "addFactor" },
    { type: "updateFactor", id: "f2", patch: { name: "B", kind: "numeric" } },
    { type: "addResponse" },
    { type: "updateResponse", id: "r1", patch: { name: "y" } },
    { type: "addRow" },
    { type: "addRow" },
    { type: "setCell", row: 0, column: 3, value: "10,5" },
    { type: "setCell", row: 1, column: 3, value: "20" },
  ] as const)
    ws = workspaceReducer(ws, action);
  return ws.experiments[0] ?? newExperiment("e1", "x", T0);
}

describe("optimization helpers", () => {
  it("suggests goal limits from the observed range of the response", () => {
    const state = sample();
    expect(observedRange(state, "r1")).toEqual([10.5, 20]);
    expect(defaultGoal("maximize", [10, 20])).toEqual({
      type: "maximize",
      low: 10,
      target: 20,
      shape: 1,
    });
    expect(defaultGoal("minimize", [10, 20])).toEqual({
      type: "minimize",
      target: 10,
      high: 20,
      shape: 1,
    });
    expect(defaultGoal("target", [10, 20])).toMatchObject({ low: 10, target: 15, high: 20 });
    expect(defaultGoal("range", [10, 20])).toEqual({ type: "range", low: 12.5, high: 17.5 });
  });

  it("starts from the analysed response, the experimental region and a reproducible seed", () => {
    const setup = defaultSetup(sample());
    expect(setup.responses.map((g) => g.responseId)).toEqual(["r1"]);
    expect(setup.domain).toEqual({ type: "region" });
    expect(setup.search.seed).toBe(20261101);
    expect(setup.limits).toEqual([]);
  });

  it("rounds conditions to 5 significant digits and builds confirmation rows and plan", () => {
    expect(roundedReal(31.4481234)).toBe(31.448);
    const state = sample();
    const rows = confirmationRows(state, [[31.448, 6.2041]], 2);
    expect(rows.map((r) => r.id)).toEqual(["o1", "o2"]);
    expect(rows[0]?.factors).toEqual(["31.448", "6.2041"]);
    expect(rows[0]?.responses).toEqual([""]);
    const stat = (value: number) => ({ status: "defined" as const, value });
    const evaluation = {
      points: [
        {
          predictions: [
            {
              responseId: "r1",
              prediction: {
                fitted: stat(121.5),
                predictionLower: stat(119),
                predictionUpper: stat(124),
              },
            },
          ],
        },
      ],
    } as unknown as Evaluation;
    const plan = confirmationPlan(
      evaluation,
      [{ responseId: "r1", terms: [], goal: defaultGoal("maximize", [0, 1]), importance: 1 }],
      rows,
      2,
      0.05,
    );
    expect(plan.confidenceLevel).toBeCloseTo(0.95);
    expect(plan.predictions.map((p) => [p.rowId, p.predicted, p.lower, p.upper])).toEqual([
      ["o1", 121.5, 119, 124],
      ["o2", 121.5, 119, 124],
    ]);
  });
});

describe("optimization state", () => {
  it("stores the optimization as its own analysis without replacing the current result", () => {
    let ws = createWorkspace("p", "Projeto", "Experimento 1", T0);
    const setup = { ...defaultSetup(sample()), responses: [] };
    const result = {
      status: "found",
      candidates: [],
      provenance: {
        methodId: "desirability_optimization",
        methodVersion: 1,
        engineVersion: "0.1.0",
      },
    } as never;
    ws = workspaceReducer(ws, {
      type: "storeOptimization",
      setup,
      result,
      signature: "s1",
      now: T0,
    });
    const e = ws.experiments[0];
    expect(e?.analyses.at(-1)).toMatchObject({
      methodId: "desirability_optimization",
      signature: "s1",
    });
    expect(e?.optimization.signature).toBe("s1");
    expect(e?.result).toBeNull();
  });

  it("creates a linked confirmation experiment only when there is an optimization to link to", () => {
    let ws = createWorkspace("p", "Projeto", "Experimento 1", T0);
    const plan = { confidenceLevel: 0.95, predictions: [] };
    const none = workspaceReducer(ws, {
      type: "addConfirmation",
      name: "C",
      now: T0,
      rows: [],
      plan,
    });
    expect(none.experiments).toHaveLength(1);
    const result = {
      status: "found",
      candidates: [],
      provenance: {
        methodId: "desirability_optimization",
        methodVersion: 1,
        engineVersion: "0.1.0",
      },
    } as never;
    ws = workspaceReducer(ws, {
      type: "storeOptimization",
      setup: defaultSetup(sample()),
      result,
      signature: "s",
      now: T0,
    });
    const next = workspaceReducer(ws, {
      type: "addConfirmation",
      name: "C",
      now: T0,
      rows: [],
      plan,
    });
    expect(next.experiments).toHaveLength(2);
    expect(next.currentId).toBe("e2");
    const created = next.experiments[1];
    expect(created?.origin).toEqual({ experimentId: "e1", analysisId: "a1" });
    expect(created?.confirmation).toEqual(plan);
    expect(new Set(created?.revisions.map((r) => r.id)).size).toBe(created?.revisions.length);
  });
});
