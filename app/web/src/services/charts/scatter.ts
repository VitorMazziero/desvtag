import { clipLine } from "./layout";
// Dispersão para diagnósticos (U09): resíduos × ajustados e gráfico quantil–quantil normal.
import {
  close,
  DEFAULT_FRAME,
  dataMarks,
  esc,
  type Frame,
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

export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ScatterSpec {
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  points: ScatterPoint[];
  /** Linha de referência: `zero` (y = 0), `quartiles` (reta pelos quartis, para o QQ) ou `identity` (y = x). */
  reference: "zero" | "quartiles" | "identity";
  /** Texto curto sobre como ler o gráfico; sempre exibido. */
  legend: string;
  metadata?: string;
  /** Identificador único do gráfico na página (ids de título e descrição). */
  id: string;
}

function quartileLine(points: ScatterPoint[]): [ScatterPoint, ScatterPoint] | null {
  if (points.length < 4) return null;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const at = (p: number): ScatterPoint | undefined => sorted[Math.round((sorted.length - 1) * p)];
  const [lo, hi] = [at(0.25), at(0.75)];
  return lo && hi && hi.x !== lo.x ? [lo, hi] : null;
}

export function scatterChart(
  spec: ScatterSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const frame: Frame = { ...DEFAULT_FRAME, bottom: 100 };
  if (spec.reference === "identity")
    frame.height = frame.width - frame.left - frame.right + frame.top + frame.bottom;
  const xs = spec.points.map((p) => p.x);
  const ys = spec.points.map((p) => p.y);
  const xMin = Math.min(...xs, ...(spec.reference === "identity" ? ys : []));
  const xMax = Math.max(...xs, ...(spec.reference === "identity" ? ys : []));
  const xPad = (xMax - xMin || 1) * 0.06;
  const yMin =
    spec.reference === "identity"
      ? xMin
      : Math.min(...ys, spec.reference === "zero" ? 0 : Number.POSITIVE_INFINITY);
  const yMax =
    spec.reference === "identity"
      ? xMax
      : Math.max(...ys, spec.reference === "zero" ? 0 : Number.NEGATIVE_INFINITY);
  const yPad = spec.reference === "identity" ? xPad : (yMax - yMin || 1) * 0.08;
  const axis = yAxis(frame, [yMin - yPad, yMax + yPad], spec.yLabel, mode, format);
  const xDomain: [number, number] =
    spec.reference === "identity" ? axis.domain : [xMin - xPad, xMax + xPad];
  const xScale = linear(xDomain, [frame.left, frame.width - frame.right]);
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata), axis.svg];
  parts.push(
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  for (const tick of niceTicks(...xDomain)) {
    const x = xScale(tick);
    if (x < frame.left || x > frame.width - frame.right) continue;
    parts.push(
      text(x, frame.height - frame.bottom + 18, format(tick), mode, { role: "inkSecondary" }),
    );
  }
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 40,
      spec.xLabel,
      mode,
      { role: "inkSecondary", figure: "xLabel" },
    ),
  );
  const data: string[] = [];
  if (spec.reference === "zero") {
    data.push(
      line(frame.left, axis.scale(0), frame.width - frame.right, axis.scale(0), mode, {
        role: "ink",
        dash: "4 3",
      }),
    );
  } else if (spec.reference === "identity") {
    const [lo, hi] = xDomain;
    data.push(
      line(xScale(lo), axis.scale(lo), xScale(hi), axis.scale(hi), mode, {
        role: "ink",
        dash: "4 3",
      }),
    );
  } else {
    const ref = quartileLine(spec.points);
    if (ref) {
      const slope = (ref[1].y - ref[0].y) / (ref[1].x - ref[0].x);
      const [x0, x1] = [xMin - xPad, xMax + xPad];
      const yAt = (x: number) => ref[0].y + slope * (x - ref[0].x);
      const clipped = clipLine(xScale(x0), axis.scale(yAt(x0)), xScale(x1), axis.scale(yAt(x1)), {
        left: frame.left,
        top: frame.top,
        right: frame.width - frame.right,
        bottom: frame.height - frame.bottom,
      });
      if (clipped)
        data.push(
          line(...clipped, mode, {
            role: "ink",
            dash: "4 3",
          }),
        );
    }
  }
  for (const p of spec.points)
    data.push(
      `<circle cx="${n(xScale(p.x))}" cy="${n(axis.scale(p.y))}" r="3.5" fill="${paint("action", mode)}" fill-opacity="0.85"><title>${esc(`${p.label ? `${p.label}: ` : ""}${spec.xLabel} = ${format(p.x)}; ${spec.yLabel} = ${spec.reference === "zero" && p.y !== 0 && Math.abs(p.y) < 1e-12 ? `≈ 0 (${p.y})` : format(p.y)}`)}</title></circle>`,
    );
  parts.push(dataMarks(spec.id, data.join("")));
  parts.push(legend(frame, [spec.legend], mode));
  parts.push(close());
  return parts
    .join("")
    .replace(
      "<svg ",
      `<svg data-x-domain="${xDomain.join(" ")}" data-y-domain="${axis.domain.join(" ")}" `,
    );
}
