import type { Language } from "../../i18n";
import { ternaryChart } from "../../services/charts/ternary";
import type { MixtureGridPoint } from "../../services/engine";
import { ChartFigure } from "./ChartFigure";
import { useFigureFormat } from "./useFigureFormat";

export function TernaryPlot({
  names,
  grid,
  points,
  label,
  minLabel,
  maxLabel,
  note,
  language,
  divisions,
  boundary,
  highlight,
}: {
  names: string[];
  grid: MixtureGridPoint[];
  points: number[][];
  label: string;
  minLabel: string;
  maxLabel: string;
  note: string;
  language: Language;
  divisions?: number;
  boundary?: number[][][];
  highlight?: number[];
}) {
  const format = useFigureFormat(language);
  if (!grid.length) return null;
  const spec = {
    id: "ternary",
    title: label,
    names,
    grid,
    points,
    note,
    minLabel,
    maxLabel,
    divisions,
    boundary,
    highlight,
  };
  return (
    <ChartFigure
      testId="ternary-plot"
      screenSvg={ternaryChart(spec, "css", format)}
      exportSvg={ternaryChart(spec, "static", format)}
      fileBase="mixture-ternary"
      pngMetadata={JSON.stringify({ label, names, note })}
    />
  );
}
