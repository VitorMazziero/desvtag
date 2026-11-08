import type { CurvePoint } from "../engine";
import {
  close,
  DEFAULT_FRAME,
  dataMarks,
  esc,
  legend,
  line,
  linear,
  n,
  niceTicks,
  open,
  type PaintMode,
  paint,
  text,
  yAxis,
} from "./svg";

export interface SaturationSpec {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  points: Array<{ x: number; y: number }>;
  curve: CurvePoint[];
  bandLabel: string;
  pointsLabel: string;
  curveLabel: string;
  unavailableLabel: string;
}

/** Only the engine's fitted curve and interval are plotted; the band is never enlarged. */
export function saturationChart(
  spec: SaturationSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const frame = { ...DEFAULT_FRAME, height: 440, bottom: 120 };
  const values = spec.curve.flatMap((c) => [
    c.y,
    ...(c.lower.status === "defined" ? [c.lower.value] : []),
    ...(c.upper.status === "defined" ? [c.upper.value] : []),
  ]);
  const lo = Math.min(0, ...values, ...spec.points.map((p) => p.y)),
    hi = Math.max(...values, ...spec.points.map((p) => p.y));
  const axis = yAxis(frame, [lo, hi + (hi - lo || 1) * 0.06], spec.yLabel, mode, format);
  const xmax = Math.max(...spec.curve.map((c) => c.x), ...spec.points.map((p) => p.x));
  const sx = linear([0, xmax || 1], [frame.left, frame.width - frame.right]);
  const parts = [
    open(spec.id, frame, spec.title, `${spec.xLabel} · ${spec.yLabel}`, mode),
    axis.svg,
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      weight: 600,
      size: 14,
      figure: "title",
    }),
  ];
  for (const tick of niceTicks(0, xmax))
    if (tick <= xmax)
      parts.push(
        text(sx(tick), frame.height - frame.bottom + 18, format(tick), mode, {
          role: "inkSecondary",
        }),
      );
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 42,
      spec.xLabel,
      mode,
      { figure: "xLabel", role: "inkSecondary" },
    ),
  );
  const marks: string[] = [];
  let hasBand = false;
  let segment: CurvePoint[] = [];
  const flush = () => {
    if (segment.length > 1) {
      const upper = segment.map(
        (c) => `${n(sx(c.x))},${n(axis.scale(c.upper.status === "defined" ? c.upper.value : c.y))}`,
      );
      const lower = [...segment]
        .reverse()
        .map(
          (c) =>
            `${n(sx(c.x))},${n(axis.scale(c.lower.status === "defined" ? c.lower.value : c.y))}`,
        );
      marks.push(
        `<polygon data-confidence-band="true" points="${[...upper, ...lower].join(" ")}" fill="${paint("uncertainty", mode)}" fill-opacity="0.25"/>`,
      );
      hasBand = true;
    }
    segment = [];
  };
  for (const c of spec.curve) {
    if (c.lower.status === "defined" && c.upper.status === "defined") segment.push(c);
    else flush();
  }
  flush();
  marks.push(
    `<polyline points="${spec.curve.map((c) => `${n(sx(c.x))},${n(axis.scale(c.y))}`).join(" ")}" fill="none" stroke="${paint("action", mode)}" stroke-width="2"/>`,
  );
  spec.points.forEach(
    (p, i) =>
      void marks.push(
        `<circle cx="${n(sx(p.x))}" cy="${n(axis.scale(p.y))}" r="3.5" fill="${paint("panel", mode)}" stroke="${paint("reference", mode)}" stroke-width="1.5"><title>${esc(`${i + 1}: ${format(p.x)}; ${format(p.y)}`)}</title></circle>`,
      ),
  );
  parts.push(
    dataMarks(spec.id, marks.join("")),
    line(
      frame.left,
      frame.height - frame.bottom,
      frame.width - frame.right,
      frame.height - frame.bottom,
      mode,
      { role: "ink" },
    ),
  );
  parts.push(
    legend(
      frame,
      [spec.curveLabel, spec.pointsLabel, hasBand ? spec.bandLabel : spec.unavailableLabel],
      mode,
    ),
    close(),
  );
  return parts.join("");
}
