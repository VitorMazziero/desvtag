import { describe, expect, it } from "vitest";
import {
  commitRevision,
  initialProject,
  type ProjectState,
  projectReducer,
} from "../../state/project";
import { applyPaste, parseClipboard, parseNumberCell } from "./editing";

describe("parseNumberCell", () => {
  it("reads dot and comma decimals, scientific notation and signs", () => {
    expect(parseNumberCell("12.5")).toEqual({ ok: true, value: 12.5 });
    expect(parseNumberCell(" 12,5 ")).toEqual({ ok: true, value: 12.5 });
    expect(parseNumberCell("-0,25")).toEqual({ ok: true, value: -0.25 });
    expect(parseNumberCell("1e3")).toEqual({ ok: true, value: 1000 });
    expect(parseNumberCell(",5")).toEqual({ ok: true, value: 0.5 });
  });
  it("treats an empty cell as missing, never as zero", () => {
    expect(parseNumberCell("")).toEqual({ ok: true, value: null });
    expect(parseNumberCell("   ")).toEqual({ ok: true, value: null });
  });
  it("rejects ambiguous thousands separators, text, NaN and infinity", () => {
    for (const bad of [
      "1.234,5",
      "1,234.5",
      "abc",
      "12 5",
      "NaN",
      "Infinity",
      "-Infinity",
      "1e999x",
    ]) {
      expect(parseNumberCell(bad).ok, bad).toBe(false);
    }
    expect(parseNumberCell("1e999")).toEqual({ ok: false, code: "notFinite" });
  });
});

describe("parseClipboard", () => {
  it("splits Excel text by tabs and lines and drops the trailing empty line", () => {
    expect(parseClipboard("A\t1,5\r\nB\t2\r\n")).toEqual([
      ["A", "1,5"],
      ["B", "2"],
    ]);
  });
});

function withColumns(): ProjectState {
  let s = projectReducer(initialProject, { type: "addFactor" });
  s = projectReducer(s, { type: "addResponse" });
  return s;
}

describe("applyPaste", () => {
  it("adds rows as needed and fills factor and response cells", () => {
    const s = withColumns();
    const out = applyPaste(s, 0, 1, [
      ["A", "1,5"],
      ["B", "2"],
      ["A", ""],
    ]);
    expect(out.rows).toHaveLength(3);
    expect(out.rows.map((r) => r.factors[0])).toEqual(["A", "B", "A"]);
    expect(out.rows.map((r) => r.responses[0])).toEqual(["1,5", "2", ""]);
    expect(out.rows.map((r) => r.id)).toEqual(["o1", "o2", "o3"]);
    expect(out.ignoredColumns).toBe(0);
    expect(s.rows).toHaveLength(0);
  });
  it("reports columns beyond the grid instead of silently dropping them", () => {
    const out = applyPaste(withColumns(), 0, 1, [["A", "1", "extra", "extra2"]]);
    expect(out.ignoredColumns).toBe(2);
  });
});

describe("reducer", () => {
  it("keeps rows aligned when factors and responses are added or removed", () => {
    let s = withColumns();
    s = projectReducer(s, { type: "addRow" });
    s = projectReducer(s, { type: "addFactor" });
    expect(s.rows[0]?.factors).toHaveLength(2);
    s = projectReducer(s, { type: "removeFactor", id: "f1" });
    expect(s.rows[0]?.factors).toHaveLength(1);
    s = projectReducer(s, { type: "removeResponse", id: "r1" });
    expect(s.rows[0]?.responses).toHaveLength(0);
    expect(s.analysis.responseId).toBeNull();
  });
});

describe("dedicated occasion column", () => {
  it("pastes time after existing factor/response indices without overwriting the response", () => {
    let state = projectReducer(initialProject, { type: "addFactor" });
    state = projectReducer(state, { type: "addResponse" });
    state = projectReducer(state, { type: "setTimeColumn", visible: true });
    const pasted = applyPaste(state, 0, 0, [
      ["S1", "A", "1,5", "0,50"],
      ["S1", "B", "2,5", "1"],
    ]);
    expect(pasted.ignoredColumns).toBe(0);
    expect(pasted.rows.map((r) => [r.unitId, r.factors[0], r.responses[0], r.timeText])).toEqual([
      ["S1", "A", "1,5", "0,50"],
      ["S1", "B", "2,5", "1"],
    ]);
  });
});

it("a time-only edit creates a new immutable data revision", () => {
  let state = projectReducer(initialProject, { type: "addResponse" });
  state = projectReducer(state, { type: "addRow" });
  state = commitRevision(state, "edit", "2026-11-03T12:00:00Z");
  const previous = state.revisions.at(-1);
  state = projectReducer(state, { type: "setCell", row: 0, column: 2, value: "0,50" });
  state = commitRevision(state, "edit", "2026-11-03T12:01:00Z");
  expect(state.revisions.at(-1)?.id).not.toBe(previous?.id);
  expect(state.revisions.at(-1)?.data.rows[0]?.timeText).toBe("0,50");
  expect(previous?.data.rows[0]?.timeText).toBeUndefined();
});
