import { describe, expect, it } from "vitest";
import { effectiveSetup } from "../features/optimization/optimizationSetup";
import {
  createWorkspace,
  currentExperiment,
  toDocument,
  type Workspace,
  workspaceReducer,
} from "./workspace";

const T0 = "2026-11-01T10:00:00.000Z";
const T1 = "2026-11-01T10:05:00.000Z";

function run(ws: Workspace, ...actions: Parameters<typeof workspaceReducer>[1][]): Workspace {
  return actions.reduce(workspaceReducer, ws);
}

function twoResponses(): Workspace {
  return run(
    createWorkspace("p1", "Projeto", "Experimento 1", T0),
    { type: "addFactor" },
    { type: "addFactor" },
    { type: "addResponse" },
    { type: "addResponse" },
    { type: "setAnalysis", patch: { responseId: "r1" } },
  );
}

describe("model per response", () => {
  it("keeps the chosen model of each response and brings it back when switching", () => {
    const quadraticOnly = [["f1"], ["f2"], ["f1", "f1"]];
    const ws = run(
      twoResponses(),
      { type: "setAnalysis", patch: { designTerms: quadraticOnly } },
      { type: "setAnalysis", patch: { responseId: "r2" } },
    );
    let e = currentExperiment(ws);
    // A segunda resposta ainda não tem modelo: usa o completo.
    expect(e.analysis.designTerms).toBeNull();
    expect(e.analysis.responseModels).toEqual({ r1: quadraticOnly });

    const second = run(ws, { type: "setAnalysis", patch: { designTerms: [["f1"], ["f2"]] } });
    expect(currentExperiment(second).analysis.responseModels).toEqual({
      r1: quadraticOnly,
      r2: [["f1"], ["f2"]],
    });

    const back = run(second, { type: "setAnalysis", patch: { responseId: "r1" } });
    e = currentExperiment(back);
    expect(e.analysis.designTerms).toEqual(quadraticOnly);
  });

  it("returning to the full model forgets the saved one", () => {
    const ws = run(
      twoResponses(),
      { type: "setAnalysis", patch: { designTerms: [["f1"]] } },
      { type: "setAnalysis", patch: { designTerms: null } },
    );
    expect(currentExperiment(ws).analysis.responseModels).toEqual({});
  });

  it("is saved with the project and restored without recomputation", () => {
    const ws = run(twoResponses(), {
      type: "setAnalysis",
      patch: { designTerms: [["f1"], ["f2"]] },
    });
    const doc = toDocument(ws, T1, "0.2.0");
    expect(doc.experiments[0]?.analysisSelection.responseModels).toEqual({ r1: [["f1"], ["f2"]] });
    const reopened = run(ws, {
      type: "loadDocument",
      document: doc,
      fileName: "a.enzitag",
      now: T1,
    });
    expect(currentExperiment(reopened).analysis.responseModels).toEqual({ r1: [["f1"], ["f2"]] });
  });

  it("projects without the field open with no saved models", () => {
    const doc = toDocument(twoResponses(), T1, "0.2.0");
    expect(doc.experiments[0]?.analysisSelection.responseModels).toBeUndefined();
  });

  it("the optimization uses the chosen model of each response", () => {
    const ws = run(
      twoResponses(),
      { type: "setAnalysis", patch: { designTerms: [["f1"], ["f2"]] } },
      { type: "setAnalysis", patch: { responseId: "r2" } },
    );
    const state = currentExperiment(ws);
    const setup = effectiveSetup(state, {
      responses: [
        {
          responseId: "r1",
          terms: [],
          goal: { type: "maximize", low: 0, target: 1, shape: 1 },
          importance: 1,
        },
        {
          responseId: "r2",
          terms: [],
          goal: { type: "maximize", low: 0, target: 1, shape: 1 },
          importance: 1,
        },
      ],
      limits: [],
      domain: { type: "region" },
      search: { starts: 10, seed: 1, maxCandidates: 3, clusterTolerance: 0.05 },
      alpha: 0.05,
    });
    expect(setup.responses[0]?.terms).toEqual([
      { type: "main", factorId: "f1" },
      { type: "main", factorId: "f2" },
    ]);
    // r2 (a analisada agora) usa o modelo completo: lista vazia.
    expect(setup.responses[1]?.terms).toEqual([]);
  });
});
