// Boxplot por grupo (U09): caixa Q1–Q3, mediana, bigodes e pontos distantes.
import type { BoxStats } from "../engine";
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

export interface BoxGroup {
  label: string;
  box: BoxStats | null;
  n?: number;
  values?: Array<{ value: number; id: string }>;
}

export interface BoxChartSpec {
  title: string;
  description: string;
  yLabel: string;
  /** Explica quartis e bigodes; sempre exibido. */
  legend: string;
  rawPointsLabel?: string;
  groups: BoxGroup[];
  metadata?: string;
  /** Identificador único do gráfico na página (ids de título e descrição). */
  id: string;
}

export function boxChart(
  spec: BoxChartSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const frame: Frame = { ...DEFAULT_FRAME, bottom: 112 };
  const values = spec.groups.flatMap((g) =>
    g.box ? [g.box.min, g.box.max, ...g.box.outliers.map((o) => o.value)] : [],
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.08;
  const axis = yAxis(frame, [min - pad, max + pad], spec.yLabel, mode, format);
  const slot = (frame.width - frame.right - frame.left) / Math.max(1, spec.groups.length);
  const width = Math.min(56, slot * 0.55);
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata), axis.svg];
  parts.push(
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  spec.groups.forEach((g, i) => {
    const cx = frame.left + slot * (i + 0.5);
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
    const b = g.box;
    if (!b) return;
    const marks: string[] = [];
    const y = axis.scale;
    marks.push(line(cx, y(b.whiskerHigh), cx, y(b.q3), mode, { role: "ink" }));
    marks.push(line(cx, y(b.q1), cx, y(b.whiskerLow), mode, { role: "ink" }));
    marks.push(line(cx - 8, y(b.whiskerHigh), cx + 8, y(b.whiskerHigh), mode, { role: "ink" }));
    marks.push(line(cx - 8, y(b.whiskerLow), cx + 8, y(b.whiskerLow), mode, { role: "ink" }));
    marks.push(
      `<rect x="${n(cx - width / 2)}" y="${n(y(b.q3))}" width="${n(width)}" height="${n(
        Math.max(1, y(b.q1) - y(b.q3)),
      )}" fill="${paint("action", mode)}" fill-opacity="0.25" stroke="${paint("ink", mode)}"/>`,
    );
    marks.push(
      line(cx - width / 2, y(b.median), cx + width / 2, y(b.median), mode, {
        role: "ink",
        width: 2.5,
      }),
    );
    for (const o of b.outliers)
      marks.push(
        `<circle cx="${n(cx)}" cy="${n(y(o.value))}" r="3.5" fill="none" stroke="${paint("alert", mode)}" stroke-width="1.5"/>`,
      );
    if (g.values && g.values.length <= 30)
      g.values.forEach(
        (p, j) =>
          void marks.push(
            `<circle data-raw-observation="true" cx="${n(cx + ((j % 7) - 3) * 4)}" cy="${n(y(p.value))}" r="3" fill="${paint("panel", mode)}" stroke="${paint("ink", mode)}"><title>${esc(`${p.id}: ${format(p.value)}`)}</title></circle>`,
          ),
      );
    parts.push(dataMarks(spec.id, marks.join("")));
  });
  parts.push(
    legend(
      frame,
      [
        spec.legend,
        ...(spec.rawPointsLabel && spec.groups.some((g) => g.values && g.values.length <= 30)
          ? [spec.rawPointsLabel]
          : []),
      ],
      mode,
    ),
  );
  parts.push(close());
  return parts.join("");
}
