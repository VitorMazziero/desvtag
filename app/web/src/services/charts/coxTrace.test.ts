import { expect, it } from "vitest";
import type { CoxTrace } from "../engine";
import { coxTraceChart } from "./coxTrace";

it("splits a curve at every undefined prediction, preserving isolated estimates", () => {
  const trace: CoxTrace = {
    reference: [0.5, 0.5],
    series: [
      {
        component: 0,
        interval: [0, 1],
        points: [0, 0.25, 0.5, 0.75, 1].map((fraction, index) => ({
          delta: fraction - 0.5,
          proportions: [fraction, 1 - fraction],
          pseudo: [fraction, 1 - fraction],
          value:
            index === 2
              ? { status: "undefined", reason: "notEstimable" }
              : { status: "defined", value: 10 + fraction },
        })),
      },
    ],
  };
  const svg = coxTraceChart(
    {
      id: "cox",
      title: "Cox",
      xLabel: "delta",
      yLabel: "response",
      note: "",
      names: ["A", "B"],
      trace,
    },
    "static",
    String,
  );
  const document = new DOMParser().parseFromString(svg, "image/svg+xml");
  const paths = [...document.querySelectorAll("polyline[data-cox-series]")];
  expect(paths).toHaveLength(2);
  expect(paths.map((path) => path.getAttribute("points")?.split(" ").length)).toEqual([2, 2]);
  expect(document.querySelectorAll("[data-chart-data] circle")).toHaveLength(4);
  expect(svg).not.toMatch(/NaN|Infinity/);
});
