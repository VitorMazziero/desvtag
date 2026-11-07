// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ProjectDocument } from "../services/engine";
import type { StoreFamilyAction } from "./familyActions";
import { snapshotData } from "./project";
import {
  commitWorkspace,
  createWorkspace,
  currentExperiment,
  toDocument,
  type Workspace,
  workspaceReducer,
} from "./workspace";

const NOW = "2026-11-03T12:00:00Z";
const START = "2026-11-03T11:59:00Z";
const file = fileURLToPath(
  new URL(
    "../../../../validation/cases/project_file/families/nonlinear_keeps_its_fitted_model_and_previous_engine_even_after_selection_changes.json",
    import.meta.url,
  ),
);

function loaded(): Workspace {
  return workspaceReducer(createWorkspace("p0", "", "", START), {
    type: "loadDocument",
    document: JSON.parse(readFileSync(file, "utf8")) as ProjectDocument,
    fileName: "family.enzitag",
    now: START,
  });
}

function calculation(ws: Workspace): Extract<StoreFamilyAction, { family: "nonlinear" }> {
  const state = currentExperiment(ws);
  const saved = state.nonlinearResult;
  if (!saved?.records[0]) throw new Error("test requires a stored nonlinear result");
  return {
    type: "storeFamily",
    family: "nonlinear",
    projectId: ws.projectId,
    epoch: ws.epoch,
    experimentId: state.id,
    data: snapshotData(state),
    signature: "nonlinear:v1:captured",
    startedAt: START,
    now: NOW,
    selection: saved.selection,
    input: saved.records[0].input,
    result: saved.records[0].result,
  };
}

describe("saved-family completion", () => {
  it("keeps current edits and selection while recording the exact request-time revision", () => {
    let ws = loaded();
    // Unit labels are irrelevant to this nonlinear request but belong to its raw snapshot.
    ws = workspaceReducer(ws, { type: "setCell", row: 0, column: 0, value: "unit-at-request" });
    const action = calculation(ws);
    ws = workspaceReducer(ws, { type: "setCell", row: 0, column: 2, value: "999" });
    ws = workspaceReducer(ws, {
      type: "setFamilySelection",
      family: "nonlinear",
      selection: { ...action.selection, model: "haldane" },
    });
    ws = workspaceReducer(ws, action);
    const state = currentExperiment(ws);
    const latest = state.nonlinearResult?.records.at(-1);
    expect(latest?.input).toEqual(action.input);
    expect(state.nonlinearResult?.selection.model).toBe("haldane");
    expect(state.rows[0]?.responses[0]).toBe("999");
    const historical = state.revisions.find((r) => r.id === latest?.revisionId);
    expect(historical?.data.rows[0]?.unitId).toBe("unit-at-request");
    expect(historical?.data.rows[0]?.responses[0]).toBe(action.data.rows[0]?.responses[0]);
    expect(state.revisions.at(-1)?.data.rows[0]?.responses[0]).toBe("999");
    expect(historical?.id).not.toBe(state.revisions.at(-1)?.id);
    const document = toDocument(commitWorkspace(ws, "manualSave", NOW), NOW, "0.4.0-dev");
    const reopened = workspaceReducer(loaded(), {
      type: "loadDocument",
      document,
      fileName: "late.enzitag",
      now: NOW,
    });
    expect(currentExperiment(reopened).rows[0]?.responses[0]).toBe("999");
    expect(currentExperiment(reopened).nonlinearResult?.records.at(-1)?.revisionId).toBe(
      historical?.id,
    );
    if (!latest) throw new Error("calculation not saved");
    ws = workspaceReducer(ws, {
      type: "addComment",
      target: { kind: "analysis", analysisId: latest.id },
      text: "Historical model",
      author: "Ana",
      now: NOW,
    });
    expect(currentExperiment(ws).comments.at(-1)?.revisionId).toBe(historical?.id);
  });

  it("saves into the originating experiment without changing the currently selected experiment", () => {
    let ws = loaded();
    const action = calculation(ws);
    ws = workspaceReducer(ws, { type: "addExperiment", name: "Other experiment", now: NOW });
    const currentId = ws.currentId;
    ws = workspaceReducer(ws, action);
    expect(ws.currentId).toBe(currentId);
    expect(currentExperiment(ws).nonlinearResult).toBeNull();
    expect(
      ws.experiments.find((e) => e.id === action.experimentId)?.nonlinearResult?.records,
    ).toHaveLength(2);
  });

  it("ignores a response from before reopening/replacing the project", () => {
    const original = loaded();
    const action = calculation(original);
    const document = toDocument(original, NOW, "0.4.0-dev");
    const reopened = workspaceReducer(original, {
      type: "loadDocument",
      document,
      fileName: "again.enzitag",
      now: NOW,
    });
    expect(workspaceReducer(reopened, action)).toBe(reopened);
    const replaced = workspaceReducer(original, {
      type: "newProject",
      projectId: "new",
      name: "",
      experimentName: "New",
      now: NOW,
    });
    expect(workspaceReducer(replaced, action)).toBe(replaced);
  });

  it("continues unique analysis ids after saving and reopening family-only results", () => {
    let ws = loaded();
    ws = workspaceReducer(ws, calculation(ws));
    ws = workspaceReducer(ws, calculation(ws));
    const document = toDocument(ws, NOW, "0.4.0-dev");
    ws = workspaceReducer(ws, {
      type: "loadDocument",
      document,
      fileName: "ids.enzitag",
      now: NOW,
    });
    expect(currentExperiment(ws).counters.analysis).toBe(2);
    ws = workspaceReducer(ws, calculation(ws));
    const ids = currentExperiment(ws).nonlinearResult?.records.map((r) => r.id);
    expect(ids).toEqual(["nonlinear-1", "a1", "a2", "a3"]);
    expect(new Set(ids).size).toBe(ids?.length);
  });
});
