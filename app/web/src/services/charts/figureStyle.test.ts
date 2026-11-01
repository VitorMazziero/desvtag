import { describe, expect, it } from "vitest";
import { applyFigureStyle, defaultFigureText, figureFields } from "./figureStyle";
import { meansChart, scatterChart } from "./index";

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

const means = {
  id: "m",
  title: "Médias",
  description: "descrição",
  yLabel: "U/mL",
  uncertaintyName: "Barras: média ± IC 95%",
  lettersLegend: "Letras em comum = diferença não detectada",
  groups: [
    { label: "controle", mean: 10, lower: 9.5, upper: 10.5, letters: "c" },
    { label: "pH 7", mean: 16, lower: 15.4, upper: 16.6, letters: "a" },
  ],
};

const scatter = {
  id: "s",
  title: "Resíduos",
  description: "d",
  xLabel: "Ajustado",
  yLabel: "Resíduo",
  points: [
    { x: 1, y: 2 },
    { x: 2, y: 1 },
  ],
  reference: "zero" as const,
  legend: "legenda",
};

describe("figure customization", () => {
  it("finds the customizable fields from the marked texts", () => {
    expect(figureFields(meansChart(means, "css", fmt))).toEqual(["title", "yLabel", "letters"]);
    expect(figureFields(scatterChart(scatter, "css", fmt))).toEqual(["title", "xLabel", "yLabel"]);
  });

  it("reads the default texts to suggest them", () => {
    const svg = scatterChart(scatter, "css", fmt);
    expect(defaultFigureText(svg, "title")).toBe("Resíduos");
    expect(defaultFigureText(svg, "xLabel")).toBe("Ajustado");
  });

  it("replaces title and axis labels (escaped) and keeps the accessible title in sync", () => {
    const svg = applyFigureStyle(meansChart(means, "static", fmt), {
      title: 'Atividade <A&B> "x"',
      yLabel: "Atividade (U/mL)",
    });
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("title")?.textContent).toBe('Atividade <A&B> "x"');
    expect(doc.querySelector('text[data-figure="title"]')?.textContent).toBe('Atividade <A&B> "x"');
    expect(doc.querySelector('text[data-figure="yLabel"]')?.textContent).toBe("Atividade (U/mL)");
    expect(svg).not.toContain("<A&B>");
  });

  it("hides the letters and their legend without touching the bars or the uncertainty legend", () => {
    const plain = meansChart(means, "static", fmt);
    const svg = applyFigureStyle(plain, { showLetters: false });
    expect(plain).toContain(">c<");
    expect(svg).not.toContain(">c<");
    expect(svg).not.toContain(">a<");
    expect(svg).not.toContain("Letras em comum");
    expect(svg).toContain("Barras: média ± IC 95%");
    expect(svg.match(/<rect/g)?.length).toBe(plain.match(/<rect/g)?.length);
  });

  it("leaves the SVG untouched without a style and ignores blank texts", () => {
    const plain = meansChart(means, "css", fmt);
    expect(applyFigureStyle(plain, undefined)).toBe(plain);
    expect(applyFigureStyle(plain, {})).toBe(plain);
    expect(applyFigureStyle(plain, { title: "   " })).toBe(plain);
  });

  it("limits custom texts to 200 characters", () => {
    const svg = applyFigureStyle(meansChart(means, "css", fmt), { title: "x".repeat(500) });
    expect(defaultFigureText(svg, "title")).toHaveLength(200);
  });
});
