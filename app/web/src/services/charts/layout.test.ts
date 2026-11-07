import { describe, expect, it } from "vitest";
import type { SurfaceGrid } from "../engine";
import {
  applyChartStyle,
  boxChart,
  contourChart,
  effectsChart,
  meansChart,
  paretoChart,
  scatterChart,
  surface3dChart,
} from "./index";
import { clipLine, textWidth, wrapWidth } from "./layout";
import { saturationChart } from "./saturation";
import { ternaryChart } from "./ternary";

const fmt = (v: number) => v.toFixed(2);
const note =
  "Barras que ultrapassam a linha crítica indicam evidência. A leitura depende do modelo, da incerteza e do experimento. ".repeat(
    3,
  );
const common = {
  id: "audit",
  title: "Título científico longo com unidades, método e condições experimentais ".repeat(3),
  description: "Teste da composição",
};
const grid = {
  xFactor: "f1",
  xName: "Temperatura",
  yFactor: "f2",
  yName: "pH",
  x: [20, 40],
  y: [5, 7],
  z: [
    [
      { status: "defined", value: 1 },
      { status: "defined", value: 2 },
    ],
    [
      { status: "defined", value: 3 },
      { status: "defined", value: 4 },
    ],
  ],
  zMin: 1,
  zMax: 4,
  extrapolated: [
    [false, false],
    [false, false],
  ],
  fixed: [],
  contours: [],
} as unknown as SurfaceGrid;
const surface = {
  ...common,
  grid,
  responseLabel: "Atividade",
  texts: { extrapolated: "Extrapolação", points: "Ensaios", reading: note },
};
const families = {
  means: () =>
    meansChart(
      {
        ...common,
        yLabel: "Atividade",
        uncertaintyName: note,
        lettersLegend: note,
        groups: [{ label: "Controle", mean: 5, lower: 4, upper: 6, letters: "a" }],
      },
      "static",
      fmt,
    ),
  box: () =>
    boxChart(
      {
        ...common,
        yLabel: "Atividade",
        legend: note,
        groups: [
          {
            label: "Controle",
            box: {
              min: 1,
              q1: 2,
              median: 3,
              q3: 4,
              max: 7,
              whiskerLow: 1,
              whiskerHigh: 5,
              outliers: [{ observationId: "o1", value: 7 }],
            },
          },
        ],
      },
      "static",
      fmt,
    ),
  scatter: () =>
    scatterChart(
      {
        ...common,
        xLabel: "Quantis",
        yLabel: "Resíduos",
        legend: note,
        reference: "quartiles",
        points: [
          { x: -2, y: -20 },
          { x: -1, y: -1 },
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 2, y: 20 },
        ],
      },
      "static",
      fmt,
    ),
  pareto: () =>
    paretoChart(
      {
        ...common,
        axisLabel: "Efeito",
        referenceLabel: "Linha crítica",
        reference: 2,
        legend: note,
        bars: [{ label: "Temperatura", value: 5, significant: true }],
      },
      "static",
      fmt,
    ),
  effects: () =>
    effectsChart(
      {
        ...common,
        yLabel: "Atividade",
        lowLabel: "20",
        highLabel: "40",
        centerLabel: "Centro",
        legend: note,
        panels: [
          {
            title: "Temperatura × pH",
            center: null,
            series: [
              { name: "pH 5", low: 1, high: 1.1 },
              { name: "pH 7", low: 1.01, high: 1.11, dashed: true },
            ],
          },
        ],
      },
      "static",
      fmt,
    ),
  saturation: () =>
    saturationChart(
      {
        ...common,
        xLabel: "Substrato [g/L]",
        yLabel: "Atividade [U/mL]",
        points: [{ x: 1, y: 2 }],
        curve: [
          {
            x: 0,
            y: 0,
            lower: { status: "defined", value: 0 },
            upper: { status: "defined", value: 0 },
          },
          {
            x: 2,
            y: 3,
            lower: { status: "defined", value: 2.5 },
            upper: { status: "defined", value: 3.5 },
          },
        ],
        bandLabel: note,
        pointsLabel: "Observações",
        curveLabel: "Ajuste",
        unavailableLabel: "Sem intervalo",
      },
      "static",
      fmt,
    ),
  ternary: () =>
    ternaryChart(
      {
        ...common,
        names: ["Componente A", "Componente B", "Componente C"],
        grid: [
          { pseudo: [1, 0, 0], proportions: [1, 0, 0], value: 1 },
          { pseudo: [0, 1, 0], proportions: [0, 1, 0], value: 2 },
          { pseudo: [0, 0, 1], proportions: [0, 0, 1], value: 3 },
        ],
        points: [[1, 0, 0]],
        note,
        minLabel: "Mínimo",
        maxLabel: "Máximo",
      },
      "static",
      fmt,
    ),
  contour: () => contourChart(surface, "static", fmt),
  surface: () => surface3dChart(surface, { azimuth: 35, elevation: 30 }, "static", fmt),
};
describe("figure composition at all supported font scales", () => {
  for (const [family, generate] of Object.entries(families))
    for (const scale of [0.85, 1, 1.2])
      it(`${family} / ${scale}: clipped data, complete notes and expanded title`, () => {
        const source = generate();
        const svg = applyChartStyle(source, { fontScale: scale, palette: "default" });
        const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
        expect(doc.querySelector("parsererror")).toBeNull();
        expect(svg).not.toMatch(/NaN|Infinity/);
        const dims = doc.documentElement.getAttribute("viewBox")!.split(" ").map(Number);
        const height = dims[3]!;
        expect(doc.querySelectorAll('text[data-figure="title"] tspan').length).toBeGreaterThan(1);
        const notes = [
          ...doc.querySelectorAll('text[data-figure="legend"],text[data-figure="lettersLegend"]'),
        ];
        expect(
          notes
            .map((n) => n.textContent)
            .join(" ")
            .replace(/\s+/g, " "),
        ).toContain("A leitura depende do modelo");
        for (const node of notes) {
          const x = Number(node.getAttribute("x"));
          const size = Number(node.getAttribute("font-size"));
          expect(x + textWidth(node.textContent!, size)).toBeLessThanOrEqual(dims[2]! - 8);
          const parent = node.parentElement;
          const shift =
            parent?.getAttribute("transform")?.match(/translate\(0 ([\d.]+)\)/)?.[1] ?? 0;
          expect(Number(node.getAttribute("y")) + Number(shift) + size * 0.4).toBeLessThan(height);
        }
        const marks = [...doc.querySelectorAll("g[data-chart-data]")];
        expect(marks.length).toBeGreaterThan(0);
        for (const group of marks) {
          const id = group.getAttribute("clip-path")!.slice(5, -1);
          expect(doc.getElementById(id)?.querySelector("rect")).not.toBeNull();
        }
      });
  it("intersects steep and horizontal references with the plot rather than hiding the overflow", () => {
    clipLine(-10, -100, 20, 200, { left: 0, top: 0, right: 10, bottom: 10 })!.forEach((v, i) => {
      expect(v).toBeCloseTo([0, 0, 1, 10][i]!);
    });
    expect(clipLine(-5, 5, 15, 5, { left: 0, top: 0, right: 10, bottom: 10 })).toEqual([
      0, 5, 10, 5,
    ]);
    expect(clipLine(-5, -5, -1, -1, { left: 0, top: 0, right: 10, bottom: 10 })).toBeNull();
  });
  it("wraps long unbroken labels without losing text", () => {
    const value = "W".repeat(200);
    const lines = wrapWidth(value, 180, 14.4);
    expect(lines.join("")).toBe(value);
    expect(lines.every((l) => textWidth(l, 14.4) <= 180)).toBe(true);
  });
  it("reserves a left gutter for Pareto factor names before data begins", () => {
    const svg = paretoChart(
      {
        ...common,
        axisLabel: "Efeito",
        referenceLabel: null,
        reference: null,
        legend: note,
        bars: [{ label: "Extrato de levedura", value: 4, significant: true }],
      },
      "static",
      fmt,
    );
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const dataLeft = Number(doc.documentElement.getAttribute("data-plot")!.split(" ")[0]);
    const label = [...doc.querySelectorAll("text")].find(
      (node) => node.textContent === "Extrato de levedura",
    )!;
    expect(Number(label.getAttribute("x"))).toBeLessThan(dataLeft - 4);
    expect(dataLeft).toBeGreaterThan(textWidth("Extrato de levedura", 14.4) + 16);
  });
});
