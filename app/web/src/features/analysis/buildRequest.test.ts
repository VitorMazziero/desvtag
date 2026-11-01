import { describe, expect, it } from "vitest";
import { initialProject, type ProjectState, projectReducer } from "../../state/project";
import { analysisKind, buildDataset, buildOperation, inputSignature } from "./buildRequest";

function sample(): ProjectState {
  let s = projectReducer(initialProject, { type: "addFactor" });
  s = projectReducer(s, {
    type: "updateFactor",
    id: "f1",
    patch: { name: "Condição", levelsText: "A; B" },
  });
  s = projectReducer(s, { type: "addResponse" });
  s = projectReducer(s, {
    type: "updateResponse",
    id: "r1",
    patch: { name: "Atividade", unit: "U/mL" },
  });
  s = projectReducer(s, { type: "addRow" });
  s = projectReducer(s, { type: "addRow" });
  s = projectReducer(s, { type: "setCell", row: 0, column: 1, value: "A" });
  s = projectReducer(s, { type: "setCell", row: 0, column: 2, value: "1,5" });
  s = projectReducer(s, { type: "setCell", row: 1, column: 1, value: "B" });
  return s;
}

describe("buildDataset", () => {
  it("converts text to numbers, empty cells to null and keeps names as typed", () => {
    const { dataset, cellErrors } = buildDataset(sample());
    expect(cellErrors).toEqual([]);
    expect(dataset.factors[0]).toMatchObject({ name: "Condição", levels: ["A", "B"], unit: null });
    expect(dataset.responses[0]).toMatchObject({ name: "Atividade", unit: "U/mL" });
    expect(dataset.observations[0]).toMatchObject({
      factors: ["A"],
      responses: [1.5],
      unitId: null,
    });
    expect(dataset.observations[1]?.responses).toEqual([null]);
  });
  it("reports unreadable cells by position and never sends NaN", () => {
    const s = projectReducer(sample(), { type: "setCell", row: 1, column: 2, value: "abc" });
    const { dataset, cellErrors } = buildDataset(s);
    expect(cellErrors).toEqual([{ row: 1, column: 2, code: "notANumber" }]);
    expect(dataset.observations[1]?.responses).toEqual([null]);
    expect(JSON.stringify(dataset)).not.toContain("NaN");
  });
});

describe("buildOperation and signature", () => {
  it("needs a selected response", () => {
    const s = sample();
    expect(
      buildOperation(
        { ...s, analysis: { ...s.analysis, responseId: null } },
        buildDataset(s).dataset,
      ),
    ).toBeNull();
    const op = buildOperation(s, buildDataset(s).dataset);
    expect(op).toMatchObject({ type: "descriptiveSummarize", responseId: "r1", groupBy: [] });
  });
  it("changes when data or options change", () => {
    const s = sample();
    const before = inputSignature(s);
    expect(
      inputSignature(projectReducer(s, { type: "setCell", row: 1, column: 2, value: "3" })),
    ).not.toBe(before);
    expect(
      inputSignature(projectReducer(s, { type: "setAnalysis", patch: { groupBy: ["f1"] } })),
    ).not.toBe(before);
    expect(inputSignature(s)).toBe(before);
  });
});

describe("comparison of treatments", () => {
  const compare = (): ProjectState => ({
    ...sample(),
    path: "compare",
    analysis: {
      responseId: "r1",
      groupBy: [],
      factorId: "f1",
      alpha: 0.05,
      procedure: null,
      factorial: null,
      designTerms: null,
      includeCurvature: true,
      surface: false,
    },
  });

  it("builds the one-way operation only when a factor is chosen", () => {
    const s = compare();
    expect(analysisKind(s)).toBe("oneWay");
    expect(buildOperation(s, buildDataset(s).dataset)).toMatchObject({
      type: "comparisonOneWay",
      responseId: "r1",
      factorId: "f1",
      alpha: 0.05,
    });
    const noFactor = { ...s, analysis: { ...s.analysis, factorId: null } };
    expect(buildOperation(noFactor, buildDataset(noFactor).dataset)).toBeNull();
  });

  it("changes the signature with the factor and with alpha, and differs from the descriptive one", () => {
    const s = compare();
    const base = inputSignature(s);
    expect(inputSignature({ ...s, analysis: { ...s.analysis, alpha: 0.01 } })).not.toBe(base);
    expect(inputSignature({ ...s, analysis: { ...s.analysis, factorId: null } })).not.toBe(base);
    expect(inputSignature({ ...s, path: "analyze" })).not.toBe(base);
  });
});
