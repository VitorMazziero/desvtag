import { describe, expect, it } from "vitest";
import {
  createWorkspace,
  currentExperiment,
  hasUnsavedChanges,
  toDocument,
  workspaceReducer,
} from "./workspace";

const T0 = "2026-11-02T10:00:00.000Z";
const T1 = "2026-11-02T10:05:00.000Z";
const T2 = "2026-11-02T10:10:00.000Z";

const figure = { kind: "figure", key: "means" } as const;

function base() {
  return createWorkspace("p1", "Projeto", "Experimento 1", T0);
}

describe("comments", () => {
  it("adds a comment tied to the latest revision, with a stable id", () => {
    const ws = workspaceReducer(base(), {
      type: "addComment",
      target: figure,
      text: "  Conferir o ponto central.  ",
      author: " Ana ",
      now: T1,
    });
    const comments = currentExperiment(ws).comments;
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      id: "c1",
      revisionId: "v1",
      author: "Ana",
      text: "Conferir o ponto central.",
      createdAt: T1,
      target: figure,
    });
    expect(hasUnsavedChanges(ws)).toBe(true);
  });

  it("ignores empty text and keeps ids unique after a deletion", () => {
    let ws = workspaceReducer(base(), {
      type: "addComment",
      target: figure,
      text: "   ",
      author: "",
      now: T1,
    });
    expect(currentExperiment(ws).comments).toHaveLength(0);
    for (const text of ["um", "dois", "três"])
      ws = workspaceReducer(ws, { type: "addComment", target: figure, text, author: "", now: T1 });
    ws = workspaceReducer(ws, { type: "deleteComment", id: "c2" });
    ws = workspaceReducer(ws, {
      type: "addComment",
      target: figure,
      text: "novo",
      author: "",
      now: T2,
    });
    const ids = currentExperiment(ws).comments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["c1", "c3", "c4"]);
  });

  it("replies and resolves, and reopening removes the resolved mark", () => {
    let ws = workspaceReducer(base(), {
      type: "addComment",
      target: { kind: "experiment" },
      text: "Pergunta",
      author: "",
      now: T1,
    });
    ws = workspaceReducer(ws, {
      type: "replyComment",
      id: "c1",
      text: "Resposta",
      author: "Bia",
      now: T1,
    });
    ws = workspaceReducer(ws, {
      type: "replyComment",
      id: "c1",
      text: "Outra",
      author: "",
      now: T2,
    });
    ws = workspaceReducer(ws, { type: "setCommentResolved", id: "c1", resolved: true, now: T2 });
    let comment = currentExperiment(ws).comments[0];
    expect(comment?.replies?.map((r) => r.id)).toEqual(["c1-r1", "c1-r2"]);
    expect(comment?.replies?.[0]?.author).toBe("Bia");
    expect(comment?.replies?.[1]?.author).toBeUndefined();
    expect(comment?.resolvedAt).toBe(T2);
    ws = workspaceReducer(ws, { type: "setCommentResolved", id: "c1", resolved: false, now: T2 });
    comment = currentExperiment(ws).comments[0];
    expect(comment?.resolvedAt).toBeUndefined();
  });

  it("survive a new revision: the comment keeps pointing to the revision where it was made", () => {
    let ws = workspaceReducer(base(), {
      type: "addComment",
      target: figure,
      text: "Antes da edição",
      author: "",
      now: T1,
    });
    ws = workspaceReducer(ws, { type: "addResponse" });
    ws = workspaceReducer(ws, { type: "commitAll", reason: "manualSave", now: T2 });
    const experiment = currentExperiment(ws);
    expect(experiment.revisions.length).toBeGreaterThan(1);
    expect(experiment.comments[0]?.revisionId).toBe("v1");
  });

  it("round-trips through the project document and omits the field when empty", () => {
    const empty = toDocument(base(), T1, "0.3.0");
    expect(empty.experiments[0]).not.toHaveProperty("comments");
    let ws = workspaceReducer(base(), {
      type: "addComment",
      target: figure,
      text: "Guardado",
      author: "Ana",
      now: T1,
    });
    ws = workspaceReducer(ws, { type: "setCommentResolved", id: "c1", resolved: true, now: T2 });
    const document = toDocument(ws, T2, "0.3.0");
    expect(document.experiments[0]?.comments).toHaveLength(1);
    const reopened = workspaceReducer(base(), {
      type: "loadDocument",
      document,
      fileName: "x.enzitag",
      now: T2,
    });
    expect(currentExperiment(reopened).comments).toEqual(currentExperiment(ws).comments);
  });
});
