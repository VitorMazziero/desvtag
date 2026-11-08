import { describe, expect, it } from "vitest";
import { boxChart, meansChart, scatterChart } from "./index";
import { esc, niceTicks } from "./svg";

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

function parse(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

const means = {
  id: "m",
  title: 'Médias <A&B> "x"',
  description: "descrição",
  yLabel: "U/mL",
  uncertaintyName: "Barras: média ± IC 95%",
  lettersLegend: "Letras em comum = diferença não detectada",
  groups: [
    { label: "controle", mean: 10, lower: 9.5, upper: 10.5, letters: "c" },
    { label: "pH 7", mean: 16, lower: 15.4, upper: 16.6, letters: "a" },
    { label: "sem incerteza", mean: 12, lower: null, upper: null, letters: "" },
  ],
};

describe("charts", () => {
  it("produce well-formed SVG with an accessible title/description and escaped text", () => {
    const svg = meansChart(means, "css", fmt);
    const doc = parse(svg);
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.getAttribute("role")).toBe("img");
    expect(doc.querySelector("title")?.textContent).toBe('Médias <A&B> "x"');
    expect(svg).not.toContain("<A&B>");
  });

  it("always names the uncertainty bar and prints the letters legend", () => {
    const svg = meansChart(means, "static", fmt);
    expect(svg).toContain("Barras: média ± IC 95%");
    expect(svg).toContain("Letras em comum = diferença não detectada");
    expect(svg).toContain(">c<");
    expect(svg).toContain(">a<");
  });

  it("uses theme variables on screen and literal colours in the export", () => {
    expect(meansChart(means, "css", fmt)).toContain("var(--chart-series");
    const exported = meansChart(means, "static", fmt);
    expect(exported).not.toContain("var(");
    expect(exported).toContain('fill="#ffffff"'); // fundo opaco para PNG
  });

  it("is deterministic and carries metadata only when given", () => {
    expect(meansChart(means, "static", fmt)).toBe(meansChart(means, "static", fmt));
    const withMeta = meansChart({ ...means, metadata: '{"method":"x"}' }, "static", fmt);
    expect(parse(withMeta).querySelector("metadata")?.textContent).toBe('{"method":"x"}');
    expect(meansChart(means, "static", fmt)).not.toContain("<metadata>");
  });

  it("never emits NaN or Infinity", () => {
    const svg = [
      meansChart(means, "css", fmt),
      boxChart(
        {
          id: "b",
          title: "b",
          description: "d",
          yLabel: "y",
          legend: "l",
          groups: [
            {
              label: "g",
              box: {
                min: 1,
                q1: 2,
                median: 3,
                q3: 4,
                max: 9,
                whiskerLow: 1,
                whiskerHigh: 5,
                outliers: [{ observationId: "o1", value: 9 }],
              },
            },
            { label: "vazio", box: null },
          ],
        },
        "css",
        fmt,
      ),
      scatterChart(
        {
          id: "s",
          title: "s",
          description: "d",
          xLabel: "x",
          yLabel: "y",
          reference: "quartiles",
          legend: "l",
          points: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 2.5 },
            { x: 4, y: 4 },
            { x: 5, y: 5.5 },
          ],
        },
        "css",
        fmt,
      ),
    ].join("");
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it("renders a constant series (zero range) without failing", () => {
    const svg = scatterChart(
      {
        id: "s",
        title: "s",
        description: "d",
        xLabel: "x",
        yLabel: "y",
        reference: "zero",
        legend: "l",
        points: [
          { x: 1, y: 0 },
          { x: 1, y: 0 },
        ],
      },
      "css",
      fmt,
    );
    expect(parse(svg).querySelector("parsererror")).toBeNull();
    expect(svg).not.toMatch(/NaN|Infinity/);
  });
});

describe("svg helpers", () => {
  it("escapes markup characters", () => {
    expect(esc(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
  it("chooses 1-2-5 ticks that cover the range", () => {
    const ticks = niceTicks(0.3, 9.4);
    expect(ticks[0]).toBeLessThanOrEqual(0.3);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(9.4 - 2);
    expect(niceTicks(3, 3).length).toBeGreaterThan(1);
  });
});

describe("legend wrapping", () => {
  it("keeps long legends inside the figure (every line is short)", async () => {
    const { wrapText } = await import("./svg");
    const lines = wrapText(
      "Pontos próximos da reta (quartis) sugerem resíduos aproximadamente normais; use também o conhecimento do experimento.",
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 84)).toBe(true);
    expect(lines.join(" ")).toContain("conhecimento do experimento.");
    expect(wrapText("curta")).toEqual(["curta"]);
  });
});
