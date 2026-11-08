// @vitest-environment node
import { expect, it } from "vitest";
import { newExperiment } from "../../state/project";
import { buildOptimalBlocks, type OptimalBlockDraft } from "./OptimalBlockOptions";

function setup() {
  const state = newExperiment("e1", "x", "2026-11-04T12:00:00Z");
  state.factors = [{ id: "b", name: "Lote", kind: "categorical", unit: "", levelsText: "" }];
  state.rows = ["Dia 1 ", "Dia 2", "Dia 1 "].map((label, i) => ({
    id: `o${i}`,
    factors: [label],
    unitId: "",
    responses: ["10"],
  }));
  const draft: OptimalBlockDraft = {
    enabled: true,
    sourceFactorId: "b",
    columnName: "Lote",
    oldLabel: "Antes",
    newBlocks: [{ id: "n", label: "Dia 3", runs: "4" }],
  };
  const rows = state.rows.map((_, index) => ({ index }));
  return { state, draft, rows };
}
it("preserves existing block assignments and adds a new allocation without rewriting cells", () => {
  const { state, draft, rows } = setup();
  expect(buildOptimalBlocks(state, rows, draft)).toEqual({
    labels: ["Dia 1", "Dia 2", "Dia 3"],
    fixedBlocks: [0, 1, 0],
    newRuns: [0, 0, 4],
  });
  expect(state.rows[0]?.factors[0]).toBe("Dia 1 ");
});
it("can add new runs inside an existing block without creating another identity", () => {
  const { state, draft, rows } = setup();
  draft.newBlocks[0] = { id: "n", label: "Dia 1", runs: "3" };
  expect(buildOptimalBlocks(state, rows, draft)?.newRuns).toEqual([3, 0]);
});
it("rejects incomplete, fractional, nonfinite and oversized allocations without numerical substitution", () => {
  for (const runs of ["", "text", "1,5", "0", "-1", "61", "1e100"]) {
    const { state, draft, rows } = setup();
    draft.newBlocks[0] = { id: "n", label: "Dia 3", runs };
    expect(buildOptimalBlocks(state, rows, draft), runs).toBeNull();
  }
});
it("refuses a missing historical block or duplicate new allocation", () => {
  const { state, draft, rows } = setup();
  state.rows[0] = { id: "o0", factors: [""], responses: ["10"], unitId: "" };
  expect(buildOptimalBlocks(state, rows, draft)).toBeNull();
  state.rows[0].factors = ["Dia 1"];
  draft.newBlocks.push({ id: "m", label: "Dia 3", runs: "2" });
  expect(buildOptimalBlocks(state, rows, draft)).toBeNull();
});
