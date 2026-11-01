import { describe, expect, it } from "vitest";
import type { GeneratedCrd } from "../../services/engine";
import { rowsFromCrd, unitIdOf } from "./crdRows";

const crd = {
  spec: {
    factorId: "f2",
    factorName: "Condição",
    levels: ["A", "B"],
    replicates: 2,
    randomize: true,
    seed: 1,
  },
  total: 4,
  runs: [
    { run: 1, standardOrder: 3, levelIndex: 1, level: "B", replicate: 1 },
    { run: 2, standardOrder: 1, levelIndex: 0, level: "A", replicate: 1 },
    { run: 3, standardOrder: 4, levelIndex: 1, level: "B", replicate: 2 },
    { run: 4, standardOrder: 2, levelIndex: 0, level: "A", replicate: 2 },
  ],
  randomizationAlgorithm: "pcg32-xsh-rr/fisher-yates",
  issues: [],
  provenance: {
    methodId: "completely_randomized_design",
    methodVersion: 1,
    engineVersion: "0.1.0",
  },
} as unknown as GeneratedCrd;

const state = {
  factors: [
    { id: "f1", name: "Dia", kind: "numeric" as const, unit: "", levelsText: "" },
    { id: "f2", name: "Condição", kind: "categorical" as const, unit: "", levelsText: "A; B" },
  ],
  responses: [{ id: "r1", name: "Atividade", unit: "" }],
  counters: { factor: 2, response: 1, row: 0, revision: 1, analysis: 0 },
};

describe("rowsFromCrd", () => {
  it("keeps the execution order, fills only the CRD factor and gives each run its own unit", () => {
    const { rows, counters } = rowsFromCrd(crd, state);
    expect(rows.map((r) => r.factors)).toEqual([
      ["", "B"],
      ["", "A"],
      ["", "B"],
      ["", "A"],
    ]);
    expect(rows.map((r) => r.unitId)).toEqual(["T2-R1", "T1-R1", "T2-R2", "T1-R2"]);
    expect(new Set(rows.map((r) => r.unitId)).size).toBe(4);
    expect(rows.every((r) => r.responses.every((c) => c === ""))).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(4);
    expect(counters.row).toBe(4);
  });

  it("unit identifiers stay stable when the seed changes (they name treatment and unit)", () => {
    expect(unitIdOf({ levelIndex: 2, replicate: 5 })).toBe("T3-R5");
  });

  it("unit identifiers are valid for the analysis request", () => {
    for (const r of rowsFromCrd(crd, state).rows)
      expect(r.unitId).toMatch(/^[A-Za-z0-9_.:-]{1,64}$/);
  });
});
