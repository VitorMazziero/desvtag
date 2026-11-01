import { describe, expect, it } from "vitest";
import { initialProject, type ProjectState, projectReducer } from "../../state/project";
import { inputSignature } from "../analysis/buildRequest";
import { canEnter, firstUnsatisfied, stepSatisfied } from "./guards";

const ctx = { cellErrorCount: 0 };

function build(): ProjectState {
  let s = projectReducer(initialProject, { type: "choosePath", path: "analyze" });
  s = projectReducer(s, { type: "addResponse" });
  s = projectReducer(s, { type: "updateResponse", id: "r1", patch: { name: "y" } });
  s = projectReducer(s, { type: "addRow" });
  return projectReducer(s, { type: "setCell", row: 0, column: 1, value: "2" });
}

describe("workflow guards", () => {
  it("starts blocked at the objective", () => {
    expect(firstUnsatisfied(initialProject, ctx)).toBe("objective");
    expect(canEnter("variables", initialProject, ctx)).toBe(false);
  });

  it("requires a named response, then data without cell errors", () => {
    const s = build();
    expect(stepSatisfied("variables", s, ctx)).toBe(true);
    expect(stepSatisfied("data", s, ctx)).toBe(true);
    expect(stepSatisfied("data", s, { cellErrorCount: 1 })).toBe(false);
    expect(stepSatisfied("data", { ...s, rows: [] }, ctx)).toBe(false);
  });

  it("opens results only with a result that matches the current inputs", () => {
    let s = build();
    expect(canEnter("results", s, ctx)).toBe(false);
    s = projectReducer(s, {
      type: "storeResult",
      now: "2026-11-01T00:00:00Z",
      result: {
        signature: inputSignature(s),
        result: {
          provenance: { methodId: "descriptive_summary", methodVersion: 1, engineVersion: "0.1.0" },
        } as never,
      },
    });
    expect(canEnter("results", s, ctx)).toBe(true);
    s = projectReducer(s, { type: "setCell", row: 0, column: 1, value: "3" });
    expect(canEnter("results", s, ctx)).toBe(false);
    expect(canEnter("data", s, ctx)).toBe(true); // etapas satisfeitas continuam acessíveis
  });
});
