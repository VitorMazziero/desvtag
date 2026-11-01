import { describe, expect, it } from "vitest";
import type { CrdSpec } from "../services/engine";
import {
  createWorkspace,
  currentExperiment,
  hasUnsavedChanges,
  toDocument,
  type Workspace,
  workspaceReducer,
} from "./workspace";

const T0 = "2026-11-01T10:00:00.000Z";
const T1 = "2026-11-01T10:05:00.000Z";

function run(ws: Workspace, ...actions: Parameters<typeof workspaceReducer>[1][]): Workspace {
  return actions.reduce(workspaceReducer, ws);
}

const spec: CrdSpec = {
  factorId: "f1",
  factorName: "Condição",
  levels: ["Controle", "pH 7"],
  replicates: 2,
  randomize: true,
  seed: 42,
};

function withCrd(): Workspace {
  const rows = [0, 1].map((i) => ({
    id: `o${i + 1}`,
    unitId: `T${i + 1}-R1`,
    factors: [spec.levels[i] ?? ""],
    responses: [""],
  }));
  return run(
    createWorkspace("p1", "Projeto", "Experimento 1", T0),
    { type: "addFactor" },
    { type: "updateFactor", id: "f1", patch: { name: "Condição", kind: "categorical" } },
    { type: "addResponse" },
    {
      type: "applyCrd",
      crd: spec,
      rows,
      counters: { factor: 1, response: 1, row: 2, revision: 1, analysis: 0 },
      now: T1,
    },
  );
}

describe("CRD in the project", () => {
  it("applyCrd stores the specification, clears the two-level design and records a 'design' revision", () => {
    const e = currentExperiment(withCrd());
    expect(e.crd).toEqual(spec);
    expect(e.design).toBeNull();
    expect(e.rows.map((r) => r.unitId)).toEqual(["T1-R1", "T2-R1"]);
    expect(e.revisions.at(-1)?.reason).toBe("design");
    expect(e.revisions.at(-2)?.reason).toBe("edit");
  });

  it("round-trips through the project document without recomputing anything", () => {
    const ws = withCrd();
    const doc = toDocument(ws, T1, "0.1.0");
    expect(doc.experiments[0]?.crd).toEqual(spec);
    const reopened = run(ws, {
      type: "loadDocument",
      document: doc,
      fileName: "a.enzitag",
      now: T1,
    });
    expect(currentExperiment(reopened).crd).toEqual(spec);
  });

  it("the specification is dropped when its factor is removed", () => {
    const ws = run(withCrd(), { type: "removeFactor", id: "f1" });
    expect(currentExperiment(ws).crd).toBeNull();
  });

  it("applying a two-level design afterwards replaces the CRD", () => {
    const ws = withCrd();
    const next = run(ws, {
      type: "applyDesign",
      design: {
        kind: { type: "fullFactorial" },
        factors: [],
        replicates: 1,
        centerPoints: 0,
        randomize: false,
        seed: 1,
      },
      rows: [],
      counters: { factor: 1, response: 1, row: 2, revision: 1, analysis: 0 },
      now: T1,
    });
    expect(currentExperiment(next).crd).toBeNull();
  });
});

describe("figure styles in the project", () => {
  it("are stored per figure, count as an unsaved change and survive save and reopen", () => {
    let ws = createWorkspace("p1", "Projeto", "Experimento 1", T0);
    ws = run(ws, { type: "markSaved", fileName: "a.enzitag", now: T0, seq: ws.changeSeq });
    expect(hasUnsavedChanges(ws)).toBe(false);
    ws = run(ws, {
      type: "setFigureStyle",
      key: "means-chart",
      style: { title: "Atividade (U/mL)", showLetters: false },
    });
    expect(hasUnsavedChanges(ws)).toBe(true);
    const doc = toDocument(ws, T1, "0.1.0");
    expect(doc.experiments[0]?.figureStyles).toEqual({
      "means-chart": { title: "Atividade (U/mL)", showLetters: false },
    });
    const reopened = run(ws, {
      type: "loadDocument",
      document: doc,
      fileName: "a.enzitag",
      now: T1,
    });
    expect(currentExperiment(reopened).figureStyles["means-chart"]).toEqual({
      title: "Atividade (U/mL)",
      showLetters: false,
    });
  });

  it("an empty style removes the entry and nothing is written to the document", () => {
    let ws = createWorkspace("p1", "Projeto", "Experimento 1", T0);
    ws = run(ws, { type: "setFigureStyle", key: "box-chart", style: { title: "x" } });
    ws = run(ws, { type: "setFigureStyle", key: "box-chart", style: null });
    expect(currentExperiment(ws).figureStyles).toEqual({});
    expect(toDocument(ws, T1, "0.1.0").experiments[0]?.figureStyles).toBeUndefined();
  });
});
