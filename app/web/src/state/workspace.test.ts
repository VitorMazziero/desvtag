import { describe, expect, it } from "vitest";
import { initialProject, newExperiment, type ProjectAction, projectReducer } from "./project";
import {
  commitWorkspace,
  createWorkspace,
  currentExperiment,
  hasUnsavedChanges,
  toDocument,
  type Workspace,
  workspaceReducer,
} from "./workspace";

const T0 = "2026-11-01T10:00:00.000Z";
const T1 = "2026-11-01T10:05:00.000Z";
const T2 = "2026-11-01T10:10:00.000Z";

function run(ws: Workspace, ...actions: Parameters<typeof workspaceReducer>[1][]): Workspace {
  return actions.reduce(workspaceReducer, ws);
}

function withData(): Workspace {
  return run(
    createWorkspace("p1", "Projeto", "Experimento 1", T0),
    { type: "addResponse" },
    { type: "updateResponse", id: "r1", patch: { name: "Atividade" } },
    { type: "addRow" },
    { type: "setCell", row: 0, column: 1, value: "10,5" },
  );
}

describe("revisions", () => {
  it("a new experiment starts with one 'created' revision", () => {
    const e = newExperiment("e1", "x", T0);
    expect(e.revisions).toHaveLength(1);
    expect(e.revisions[0]).toMatchObject({ id: "v1", parent: null, reason: "created" });
  });

  it("is not created on every keystroke: edits only become a revision at an operation boundary", () => {
    let ws = withData();
    expect(ws.experiments[0]?.revisions).toHaveLength(1);
    ws = run(
      ws,
      { type: "setCell", row: 0, column: 1, value: "10,6" },
      { type: "setCell", row: 0, column: 1, value: "10,7" },
    );
    expect(ws.experiments[0]?.revisions).toHaveLength(1);
    ws = run(ws, { type: "commitAll", reason: "manualSave", now: T1 });
    expect(ws.experiments[0]?.revisions.map((r) => [r.id, r.reason, r.parent])).toEqual([
      ["v1", "created", null],
      ["v2", "manualSave", "v1"],
    ]);
  });

  it("does not create a revision when the data did not change", () => {
    let ws = run(withData(), { type: "commitAll", reason: "manualSave", now: T1 });
    ws = run(ws, { type: "commitAll", reason: "manualSave", now: T2 });
    expect(ws.experiments[0]?.revisions).toHaveLength(2);
  });

  it("an analysis points to the revision of the data that produced it and snapshots pending edits", () => {
    const ws = run(withData(), {
      type: "storeResult",
      now: T1,
      result: {
        signature: "s1",
        kind: "descriptive",
        result: {
          provenance: { methodId: "descriptive_summary", methodVersion: 1, engineVersion: "0.1.0" },
        } as never,
      },
    });
    const e = ws.experiments[0];
    expect(e?.revisions.at(-1)).toMatchObject({ id: "v2", reason: "analysis" });
    expect(e?.analyses[0]).toMatchObject({
      id: "a1",
      revisionId: "v2",
      signature: "s1",
      methodId: "descriptive_summary",
    });
  });

  it("import snapshots the previous data first, then records the imported data", () => {
    const ws = run(withData(), {
      type: "applyImport",
      now: T1,
      data: {
        factors: [{ id: "f1", name: "g", kind: "categorical", unit: "", levelsText: "" }],
        responses: [{ id: "r1", name: "y", unit: "" }],
        rows: [{ id: "o1", unitId: "", factors: ["A"], responses: ["1"] }],
      },
    });
    const e = ws.experiments[0];
    expect(e?.revisions.map((r) => r.reason)).toEqual(["created", "edit", "import"]);
    expect(e?.revisions[1]?.data.rows[0]?.responses).toEqual(["10,5"]); // dados anteriores preservados
    expect(e?.rows[0]?.factors).toEqual(["A"]);
  });

  it("restoring creates a new revision and keeps the history intact", () => {
    let ws = run(withData(), { type: "commitAll", reason: "manualSave", now: T1 });
    ws = run(ws, { type: "setCell", row: 0, column: 1, value: "99" });
    ws = run(ws, { type: "restoreRevision", revisionId: "v2", now: T2 });
    const e = ws.experiments[0];
    expect(e?.rows[0]?.responses).toEqual(["10,5"]);
    expect(e?.revisions.map((r) => r.reason)).toEqual(["created", "manualSave", "edit", "restore"]);
    expect(e?.revisions.at(-1)?.parent).toBe("v2");
  });
});

describe("change tracking", () => {
  it("counts edits, and marks saved only up to the saved sequence (edits during a save stay unsaved)", () => {
    let ws = withData();
    expect(hasUnsavedChanges(ws)).toBe(true);
    const seq = ws.changeSeq;
    ws = run(ws, { type: "setCell", row: 0, column: 1, value: "11" }); // edição durante o salvamento
    ws = run(ws, { type: "markSaved", fileName: "a.enzitag", now: T1, seq });
    expect(hasUnsavedChanges(ws)).toBe(true);
    ws = run(ws, { type: "markSaved", fileName: "a.enzitag", now: T2, seq: ws.changeSeq });
    expect(hasUnsavedChanges(ws)).toBe(false);
    expect(ws.fileName).toBe("a.enzitag");
  });

  it("active experiment is persisted as an edit; selecting it again is a no-op", () => {
    let ws = run(createWorkspace("p", "x", "E1", T0), {
      type: "addExperiment",
      name: "E2",
      now: T0,
    });
    const seq = ws.changeSeq;
    ws = run(ws, { type: "selectExperiment", id: "e1" });
    expect(ws.changeSeq).toBe(seq + 1);
    const document = toDocument(ws, T1, "0.4.0-dev");
    expect(document.currentExperimentId).toBe("e1");
    expect(run(ws, { type: "selectExperiment", id: "e1" })).toBe(ws);
    const reopened = run(ws, { type: "loadDocument", document, fileName: "p.enzitag", now: T1 });
    expect(reopened.currentId).toBe("e1");
    const older = { ...document, currentExperimentId: undefined };
    expect(
      run(ws, { type: "loadDocument", document: older, fileName: "old.enzitag", now: T1 })
        .currentId,
    ).toBe("e1");
    ws = run(ws, { type: "renameProject", name: "novo" });
    expect(ws.changeSeq).toBe(seq + 2);
  });
});

describe("experiments", () => {
  it("edits apply only to the selected experiment", () => {
    let ws = run(createWorkspace("p", "x", "E1", T0), {
      type: "addExperiment",
      name: "E2",
      now: T0,
    });
    expect(ws.currentId).toBe("e2");
    ws = run(
      ws,
      { type: "addResponse" },
      { type: "updateResponse", id: "r1", patch: { name: "só no E2" } },
    );
    expect(ws.experiments.find((e) => e.id === "e1")?.responses).toHaveLength(0);
    expect(ws.experiments.find((e) => e.id === "e2")?.responses[0]?.name).toBe("só no E2");
  });
});

describe("document mapping", () => {
  it("toDocument then loadDocument returns an equivalent workspace (no recalculation)", () => {
    let ws = run(
      withData(),
      { type: "addExperiment", name: "E2", now: T0 },
      { type: "selectExperiment", id: "e1" },
    );
    ws = commitWorkspace(ws, "manualSave", T1);
    const doc = toDocument(ws, T2, "0.1.0");
    const back = workspaceReducer(createWorkspace("x", "", "", T0), {
      type: "loadDocument",
      document: doc,
      fileName: "f.enzitag",
      now: T2,
    });
    expect(back.projectId).toBe("p1");
    expect(back.experiments.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(back.experiments[0]?.rows).toEqual(ws.experiments[0]?.rows);
    expect(back.experiments[0]?.revisions).toEqual(ws.experiments[0]?.revisions);
    expect(hasUnsavedChanges(back)).toBe(false);
    expect(back.counters.experiment).toBe(2);
  });

  it("new ids never collide with ids loaded from a file", () => {
    const base = run(withData(), { type: "commitAll", reason: "manualSave", now: T1 });
    const doc = toDocument(base, T2, "0.1.0");
    let ws = workspaceReducer(createWorkspace("x", "", "", T0), {
      type: "loadDocument",
      document: doc,
      fileName: null,
      now: T2,
    });
    ws = run(ws, { type: "addRow" }, { type: "addResponse" }, { type: "addFactor" });
    const e = ws.experiments[0];
    expect(new Set(e?.rows.map((r) => r.id)).size).toBe(e?.rows.length);
    expect(e?.rows.map((r) => r.id)).toEqual(["o1", "o2"]);
    expect(e?.responses.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
});

describe("legacy initial state", () => {
  it("keeps the single-experiment reducer usable on its own", () => {
    const action: ProjectAction = { type: "addFactor" };
    expect(projectReducer(initialProject, action).factors).toHaveLength(1);
  });
});

describe("applyDesign", () => {
  it("keeps previous data in an edit revision and gives every revision a unique id", () => {
    const design = {
      kind: { type: "fullFactorial" as const },
      factors: [
        { id: "f1", name: "A", low: 0, high: 1, unit: null },
        { id: "f2", name: "B", low: 0, high: 1, unit: null },
      ],
      replicates: 1,
      centerPoints: 0,
      randomize: false,
      seed: 1,
    };
    let ws = run(withData(), { type: "setCell", row: 0, column: 1, value: "7" });
    const before = currentExperiment(ws);
    ws = run(ws, {
      type: "applyDesign",
      design,
      rows: [{ id: "o1", unitId: "", factors: ["0", "0"], responses: [""] }],
      counters: before.counters,
      now: T1,
    });
    const e = currentExperiment(ws);
    expect(e.design).toEqual(design);
    expect(new Set(e.revisions.map((r) => r.id)).size).toBe(e.revisions.length);
    expect(e.revisions.at(-1)?.reason).toBe("design");
    expect(e.revisions.some((r) => r.reason === "edit")).toBe(true);
    expect(e.result).toBeNull();
  });
});
