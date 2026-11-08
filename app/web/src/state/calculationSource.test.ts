// @vitest-environment node
import { expect, it } from "vitest";
import { captureCalculationSource, type ProjectAction } from "./project";
import { createWorkspace, currentExperiment, workspaceReducer } from "./workspace";

const NOW = "2026-11-04T12:00:00Z";
function context() {
  let ws = createWorkspace("p1", "x", "Original", NOW);
  for (const action of [
    { type: "addResponse" },
    { type: "addRow" },
    { type: "setCell", row: 0, column: 1, value: "10,5" },
    { type: "setAnalysis", patch: { surfaceBlock: { factorId: "block", reference: "Dia 1" } } },
  ] as ProjectAction[])
    ws = workspaceReducer(ws, action);
  return ws;
}
const result = {
  signature: "captured",
  kind: "surface" as const,
  result: {
    provenance: { methodId: "response_surface", methodVersion: 2, engineVersion: "0.4" },
  } as never,
};

it("a late result keeps original data/options while retaining edits made during calculation", () => {
  let ws = context();
  const source = captureCalculationSource(ws, currentExperiment(ws), NOW);
  ws = workspaceReducer(ws, { type: "setCell", row: 0, column: 1, value: "99" });
  ws = workspaceReducer(ws, {
    type: "setAnalysis",
    patch: { surfaceBlock: { factorId: "block", reference: "Dia 2" } },
  });
  ws = workspaceReducer(ws, { type: "storeResult", source, result, now: NOW });
  const current = currentExperiment(ws),
    record = current.analyses[0];
  expect(current.rows[0]?.responses[0]).toBe("99");
  expect(current.analysis.surfaceBlock?.reference).toBe("Dia 2");
  expect(record?.options.surfaceBlock?.reference).toBe("Dia 1");
  expect(
    current.revisions.find((revision) => revision.id === record?.revisionId)?.data.rows[0]
      ?.responses[0],
  ).toBe("10,5");
  expect(current.revisions.at(-1)?.data.rows[0]?.responses[0]).toBe("99");
});

it("a late result returns to its source experiment without selecting it", () => {
  let ws = context();
  const source = captureCalculationSource(ws, currentExperiment(ws), NOW);
  ws = workspaceReducer(ws, { type: "addExperiment", name: "Another", now: NOW });
  ws = workspaceReducer(ws, { type: "storeResult", source, result, now: NOW });
  expect(ws.currentId).toBe("e2");
  expect(ws.experiments[0]?.analyses).toHaveLength(1);
  expect(ws.experiments[1]?.analyses).toHaveLength(0);
});

it("replacement of a project invalidates captured results even if its identity is reused", () => {
  let ws = context();
  const source = captureCalculationSource(ws, currentExperiment(ws), NOW);
  ws = workspaceReducer(ws, {
    type: "newProject",
    projectId: "p1",
    name: "replacement",
    experimentName: "x",
    now: NOW,
  });
  expect(workspaceReducer(ws, { type: "storeResult", source, result, now: NOW })).toBe(ws);
});

it("a delayed optimization preserves its effective setup and the user's newer goal edits", () => {
  let ws = context();
  const source = captureCalculationSource(ws, currentExperiment(ws), NOW);
  const setup = {
    responses: [
      {
        responseId: "r1",
        terms: [],
        goal: { type: "range" as const, low: 0, high: 100 },
        importance: 1,
      },
    ],
    limits: [],
    domain: { type: "region" as const },
    search: { starts: 2, seed: 1, maxCandidates: 1, clusterTolerance: 0.01 },
    alpha: 0.05,
  };
  const edited = {
    ...setup,
    responses: [
      {
        ...setup.responses[0],
        responseId: "r1",
        terms: [],
        goal: { type: "range" as const, low: 50, high: 60 },
        importance: 1,
      },
    ],
  };
  ws = workspaceReducer(ws, { type: "setOptimizationSetup", setup: edited });
  ws = workspaceReducer(ws, { type: "setCell", row: 0, column: 1, value: "99" });
  ws = workspaceReducer(ws, {
    type: "storeOptimization",
    source,
    setup,
    signature: "optimization-original",
    result: {
      provenance: { methodId: "desirability_optimization", methodVersion: 2, engineVersion: "0.4" },
    } as never,
    now: NOW,
  });
  const experiment = currentExperiment(ws),
    record = experiment.analyses[0];
  expect(record?.options.optimization).toEqual(setup);
  expect(record?.options.surfaceBlock?.reference).toBe("Dia 1");
  expect(experiment.optimization.setup).toEqual(edited);
  expect(experiment.rows[0]?.responses[0]).toBe("99");
  expect(
    experiment.revisions.find((revision) => revision.id === record?.revisionId)?.data.rows[0]
      ?.responses[0],
  ).toBe("10,5");
});

it("applying a design cannot roll back the revision counter captured before the source snapshot", () => {
  let ws = context();
  const current = currentExperiment(ws);
  ws = workspaceReducer(ws, {
    type: "applyOptimal",
    now: NOW,
    rows: current.rows,
    counters: current.counters,
    generated: { spec: {} } as never,
    signature: "saved",
    rowIds: current.rows.map((row) => row.id),
    augment: true,
  });
  ws = workspaceReducer(ws, { type: "setCell", row: 0, column: 1, value: "20" });
  const edited = currentExperiment(ws);
  ws = workspaceReducer(ws, {
    type: "applyOptimal",
    now: NOW,
    rows: edited.rows,
    counters: edited.counters,
    generated: { spec: {} } as never,
    signature: "saved-again",
    rowIds: edited.rows.map((row) => row.id),
    augment: true,
  });
  const experiment = currentExperiment(ws);
  expect(new Set(experiment.revisions.map((revision) => revision.id)).size).toBe(
    experiment.revisions.length,
  );
  for (const record of experiment.optimalDesigns) {
    expect(experiment.revisions.some((revision) => revision.id === record.sourceRevisionId)).toBe(
      true,
    );
    expect(experiment.revisions.some((revision) => revision.id === record.revisionId)).toBe(true);
  }
  expect(experiment.optimalDesigns.map((record) => record.id)).toEqual(["a1", "a2"]);
});
