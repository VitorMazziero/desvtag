// Gráfico de médias com barra de incerteza NOMEADA e letras de comparação (U09).
import {
  close,
  DEFAULT_FRAME,
  dataMarks,
  esc,
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
  mean: number | null;
  n?: number;
  values?: Array<{ value: number; id: string }>;
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
  rawPointsLabel?: string;
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
  const lows = spec.groups.flatMap((g) =>
    g.mean === null ? [] : [g.lower ?? g.mean, ...(g.values ?? []).map((p) => p.value)],
  );
  const highs = spec.groups.flatMap((g) =>
    g.mean === null ? [] : [g.upper ?? g.mean, ...(g.values ?? []).map((p) => p.value)],
  );
  const min = Math.min(0, ...lows);
  const highest = highs.length ? Math.max(...highs) : 1;
  const max = highest + (highest - min || 1) * 0.1;
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
    if (g.mean === null) {
      parts.push(text(cx, frame.height - frame.bottom + 18, g.label, mode));
      parts.push(text(cx, (frame.top + frame.height - frame.bottom) / 2, "—", mode));
      return;
    }
    const top = axis.scale(g.mean);
    const marks: string[] = [];
    marks.push(
      `<rect x="${n(cx - barWidth / 2)}" y="${n(Math.min(top, baseY))}" width="${n(barWidth)}" ` +
        `height="${n(Math.abs(baseY - top))}" fill="${paint("action", mode)}" fill-opacity="0.75"/>`,
    );
    if (g.lower !== null && g.upper !== null) {
      const [y1, y2] = [axis.scale(g.upper), axis.scale(g.lower)];
      marks.push(line(cx, y1, cx, y2, mode, { role: "ink", width: 1.5 }));
      marks.push(line(cx - 6, y1, cx + 6, y1, mode, { role: "ink", width: 1.5 }));
      marks.push(line(cx - 6, y2, cx + 6, y2, mode, { role: "ink", width: 1.5 }));
    }
    if (g.values && g.values.length <= 30)
      g.values.forEach(
        (p, j) =>
          void marks.push(
            `<circle data-raw-observation="true" cx="${n(cx + Math.min(barWidth / 2 + 12, slot * 0.3) + ((j % 5) - 2) * Math.min(3, slot / 30))}" cy="${n(axis.scale(p.value))}" r="3" fill="${paint("panel", mode)}" stroke="${paint("ink", mode)}"><title>${esc(`${p.id}: ${format(p.value)}`)}</title></circle>`,
          ),
      );
    parts.push(dataMarks(spec.id, marks.join("")));
    // Sempre há um espaço marcado para a letra: as letras manuais da personalização ocupam-no.
    const lettersY =
      Math.min(
        g.upper !== null ? axis.scale(g.upper) : top,
        ...(g.values ?? []).map((p) => axis.scale(p.value)),
      ) - 14;
    parts.push(text(cx, lettersY, g.letters, mode, { size: 14, weight: 600, figure: "letters" }));
    parts.push(
      text(cx, frame.height - frame.bottom + 18, g.label, mode, {
        anchor: spec.groups.length > 6 ? "end" : "middle",
        rotate: spec.groups.length > 6 ? -35 : undefined,
      }),
    );
    if (g.n !== undefined)
      parts.push(
        text(cx, frame.height - frame.bottom + 36, `n = ${g.n}`, mode, {
          role: "inkSecondary",
          size: 11,
        }),
      );
  });
  parts.push(line(frame.left, baseY, frame.width - frame.right, baseY, mode, { role: "ink" }));
  parts.push(
    legend(
      frame,
      [
        spec.uncertaintyName,
        ...(spec.rawPointsLabel && spec.groups.some((g) => g.values && g.values.length <= 30)
          ? [spec.rawPointsLabel]
          : []),
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
