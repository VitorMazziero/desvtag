import { describe, expect, it } from "vitest";
import type { SurfaceGrid } from "../engine";
import { contourChart, surface3dChart } from "./index";

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);
const defined = (value: number) => ({ status: "defined" as const, value });

function grid(): SurfaceGrid {
  const x = [0, 1, 2, 3];
  const y = [0, 1, 2];
  const z = y.map((yy) => x.map((xx) => defined(xx + 2 * yy)));
  return {
    xFactor: "f1",
    xName: 'Temp <A&B> "x"',
    yFactor: "f2",
    yName: "pH",
    x,
    y,
    z,
    extrapolated: y.map((_, iy) => x.map((_, ix) => iy === 2 && ix === 3)),
    zMin: 0,
    zMax: 7,
    fixed: [{ factorId: "f3", name: "Tempo", value: 10, coded: 0 }],
    contours: [{ level: 3, segments: [{ x1: 0, y1: 1.5, x2: 1, y2: 1 }] }],
    issues: [],
    provenance: { methodId: "response_surface", methodVersion: 1, engineVersion: "0.1.0" },
  } as unknown as SurfaceGrid;
}

const spec = (id: string) => ({
  id,
  title: "Superfície <x>",
  description: "descrição",
  grid: grid(),
  responseLabel: "Atividade [U/mL]",
  points: [{ x: 1, y: 1 }],
  texts: {
    extrapolated: "Hachurado: extrapolação",
    points: "Círculos: ensaios",
    reading: "Leitura",
  },
});

function parse(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

describe("surface charts", () => {
  it("produce well-formed, accessible SVG with escaped user text and no NaN", () => {
    for (const svg of [
      contourChart(spec("c"), "css", fmt),
      surface3dChart(spec("s"), { azimuth: 35, elevation: 30 }, "static", fmt),
    ]) {
      const doc = parse(svg);
      expect(doc.querySelector("parsererror")).toBeNull();
      expect(doc.documentElement.getAttribute("role")).toBe("img");
      expect(svg).not.toMatch(/NaN|Infinity/);
      expect(svg).not.toContain("<x>");
      expect(svg).toContain("Tempo = 10"); // condições fixadas sempre visíveis
    }
  });

  it("marks the extrapolated region with a hatch pattern and says so in the legend", () => {
    const contour = contourChart(spec("c1"), "css", fmt);
    expect(contour).toContain('id="c1-hatch"');
    expect(contour).toContain('fill="url(#c1-hatch)"');
    expect(contour).toContain("Hachurado: extrapolação");
    const none = { ...spec("c2"), grid: { ...grid(), extrapolated: [[false]] } };
    expect(contourChart(none, "css", fmt)).not.toContain("Hachurado");
  });

  it("uses unique ids per chart and rotates the 3D view", () => {
    const a = surface3dChart(spec("one"), { azimuth: 0, elevation: 30 }, "css", fmt);
    const b = surface3dChart(spec("one"), { azimuth: 90, elevation: 30 }, "css", fmt);
    expect(a).toContain('id="one-t"');
    expect(a).not.toBe(b);
  });

  it("draws the engine contour segments and the design points", () => {
    const svg = contourChart(spec("c3"), "static", fmt);
    expect(svg).toContain("<path");
    expect(svg).toContain("<circle");
    expect(svg).toContain("Círculos: ensaios");
  });
});

describe("chart style", () => {
  it("scales fonts and swaps the action and alert colours for the colour-blind palette", async () => {
    const { applyChartStyle } = await import("./style");
    const svg = `<svg><text font-size="12" fill="var(--color-action, #005a99)">x</text><rect fill="#9a3412"/><text font-size="14">y</text></svg>`;
    const scaled = applyChartStyle(svg, { palette: "default", fontScale: 1.2 });
    expect(scaled).toContain('font-size="14.4"');
    expect(scaled).toContain('font-size="16.8"');
    expect(scaled).toContain("#005a99");
    const safe = applyChartStyle(svg, { palette: "colorblind", fontScale: 1 });
    expect(safe).toContain('fill="#0072B2"');
    expect(safe).toContain('fill="#D55E00"');
    expect(safe).not.toContain("#005a99");
    expect(applyChartStyle(svg, { palette: "default", fontScale: 1 })).toBe(svg);
  });
});
