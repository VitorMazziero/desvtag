// Gráfico de médias com barra de incerteza NOMEADA e letras de comparação (U09).
import {
  close,
  DEFAULT_FRAME,
  type Frame,
  legend,
  line,
  n,
  open,
  type PaintMode,
  paint,
  text,
  yAxis,
} from "./svg";

export interface MeansGroup {
  label: string;
  mean: number;
  /** Limites da barra de incerteza; ausentes quando não definidos. */
  lower: number | null;
  upper: number | null;
  /** Letras de comparação (vazio: sem letras). */
  letters: string;
}

export interface MeansChartSpec {
  title: string;
  description: string;
  yLabel: string;
  /** Nome da barra de incerteza, por exemplo "Barras: média ± IC 95%"; sempre exibido. */
  uncertaintyName: string;
  /** Legenda das letras; omitida se não houver letras. */
  lettersLegend: string;
  groups: MeansGroup[];
  metadata?: string;
  /** Identificador único do gráfico na página (ids de título e descrição). */
  id: string;
}

export function meansChart(
  spec: MeansChartSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const frame: Frame = { ...DEFAULT_FRAME, bottom: 112 };
  const lows = spec.groups.map((g) => g.lower ?? g.mean);
  const highs = spec.groups.map((g) => g.upper ?? g.mean);
  const min = Math.min(0, ...lows);
  const max = Math.max(...highs) + (Math.max(...highs) - min) * 0.1;
  const axis = yAxis(frame, [min, max], spec.yLabel, mode, format);
  const plotLeft = frame.left;
  const plotWidth = frame.width - frame.right - frame.left;
  const slot = plotWidth / Math.max(1, spec.groups.length);
  const barWidth = Math.min(64, slot * 0.6);
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata), axis.svg];
  parts.push(
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  const baseY = axis.scale(Math.max(0, min));
  spec.groups.forEach((g, i) => {
    const cx = plotLeft + slot * (i + 0.5);
    const top = axis.scale(g.mean);
    parts.push(
      `<rect x="${n(cx - barWidth / 2)}" y="${n(Math.min(top, baseY))}" width="${n(barWidth)}" ` +
        `height="${n(Math.abs(baseY - top))}" fill="${paint("action", mode)}" fill-opacity="0.75"/>`,
    );
    if (g.lower !== null && g.upper !== null) {
      const [y1, y2] = [axis.scale(g.upper), axis.scale(g.lower)];
      parts.push(line(cx, y1, cx, y2, mode, { role: "ink", width: 1.5 }));
      parts.push(line(cx - 6, y1, cx + 6, y1, mode, { role: "ink", width: 1.5 }));
      parts.push(line(cx - 6, y2, cx + 6, y2, mode, { role: "ink", width: 1.5 }));
    }
    if (g.letters !== "") {
      const y = (g.upper !== null ? axis.scale(g.upper) : top) - 8;
      parts.push(text(cx, y, g.letters, mode, { size: 14, weight: 600, figure: "letters" }));
    }
    parts.push(
      text(cx, frame.height - frame.bottom + 18, g.label, mode, {
        anchor: spec.groups.length > 6 ? "end" : "middle",
        rotate: spec.groups.length > 6 ? -35 : undefined,
      }),
    );
  });
  parts.push(line(frame.left, baseY, frame.width - frame.right, baseY, mode, { role: "ink" }));
  parts.push(
    legend(
      frame,
      [
        spec.uncertaintyName,
        ...(spec.lettersLegend === ""
          ? []
          : [{ text: spec.lettersLegend, figure: "lettersLegend" as const }]),
      ].filter((l) => l !== ""),
      mode,
    ),
  );
  parts.push(close());
  return parts.join("");
}
