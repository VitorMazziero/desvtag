import { expect, it } from "vitest";
import { layoutFigure } from "./layout";
import { optimalVarianceChart, type VariancePlotSpec } from "./optimalVariance";

const spec: VariancePlotSpec = {
  id: "variance",
  title: "Prediction variance",
  description: "Finite grid; h and n*h",
  xLabel: "Fraction",
  yLabel: "n*h",
  legend: "Uniform finite candidates, not continuous volume.",
  kind: "distribution",
  points: [
    { x: 1 / 3, y: 1, value: 1, label: "one" },
    { x: 2 / 3, y: 1, value: 1, label: "two" },
    { x: 1, y: 4, value: 4, label: "three" },
  ],
};

it("draws the exact discrete quantile steps through the full cumulative mass", () => {
  const svg = optimalVarianceChart(spec, "static", String);
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  const path = doc.querySelector("[data-chart-data] path");
  expect(path?.getAttribute("d")?.match(/L/g)).toHaveLength(6);
  expect(doc.querySelector("[data-chart-data]")?.getAttribute("clip-path")).toBe(
    "url(#variance-plot)",
  );
  expect(svg).not.toMatch(/NaN|Infinity/);
});

it("maps only supplied admissible points without interpolating excluded geometry", () => {
  const svg = optimalVarianceChart(
    {
      ...spec,
      kind: "map",
      points: [
        { x: -1, y: 0, value: 0.125, label: '<script> & "factor"' },
        { x: 1, y: 1, value: 0.5, label: "two" },
      ],
    },
    "static",
    String,
  );
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(doc.querySelectorAll("[data-chart-data] circle")).toHaveLength(2);
  expect(doc.querySelectorAll("[data-chart-data] path")).toHaveLength(0);
  expect(doc.querySelector("circle title")?.textContent).toBe('<script> & "factor"');
  expect(doc.querySelector("script")).toBeNull();
  expect([...doc.querySelectorAll("[data-chart-data] text")].map((t) => t.textContent)).toEqual([
    "0.125",
    "0.5",
  ]);
});

it("retains long localized titles and notes through the common expanding figure layout", () => {
  const original = optimalVarianceChart(
    {
      ...spec,
      title: "Precision and factor name ".repeat(12),
      legend: "Conditional on the declared block; equal grid weights. ".repeat(12),
    },
    "static",
    String,
  );
  const svg = layoutFigure(original),
    doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const title = doc.querySelector('[data-figure="title"]');
  expect(title?.querySelectorAll("tspan").length).toBeGreaterThan(1);
  expect(Number(doc.documentElement.getAttribute("viewBox")?.split(" ")[3])).toBeGreaterThan(500);
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(svg).not.toMatch(/NaN|Infinity/);
});
