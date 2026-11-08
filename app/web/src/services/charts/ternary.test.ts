import { describe, expect, it } from "vitest";
import { type TernarySpec, ternaryChart } from "./ternary";

const spec: TernarySpec = {
  id: "bounded",
  title: "Mixture",
  names: ["A", "B", "C"],
  grid: [
    { pseudo: [1, 0, 0], proportions: [1, 0, 0], value: 10 },
    { pseudo: [0, 1, 0], proportions: [0, 1, 0], value: 20 },
    { pseudo: [0, 0, 1], proportions: [0, 0, 1], value: 30 },
  ],
  points: [],
  note: "",
  minLabel: "Min",
  maxLabel: "Max",
};

const cells = (input: TernarySpec) =>
  new DOMParser()
    .parseFromString(ternaryChart(input, "static", String), "image/svg+xml")
    .querySelectorAll('[data-chart-data="true"] polygon').length;

describe("ternary prediction domain", () => {
  it("keeps the legacy full grid and never fills a missing prediction corner", () => {
    expect(cells(spec)).toBe(1);
    expect(cells({ ...spec, grid: spec.grid.slice(0, 2), divisions: 1 })).toBe(0);
  });
  it("uses explicit resolution for sparse or clipped grids", () => {
    expect(cells({ ...spec, divisions: 24 })).toBe(0);
  });
});
