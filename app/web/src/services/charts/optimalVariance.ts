// Values and cumulative masses come from Rust; this module only draws them.
import { textWidth } from "./layout";
import {
  close,
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
  wrapText,
} from "./svg";

export interface VariancePlotSpec {
  id: string;
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  legend: string;
  kind: "distribution" | "curve" | "map";
  points: Array<{ x: number; y: number; value: number; label: string }>;
  colorDomain?: [number, number];
  metadata?: string;
}

export function optimalVarianceChart(
  spec: VariancePlotSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  if (!spec.points.length) return "";
  const xs = spec.points.map((p) => p.x),
    ys = spec.points.map((p) => p.y);
  const xmin = spec.kind === "distribution" ? 0 : Math.min(...xs),
    xmax = spec.kind === "distribution" ? 1 : Math.max(...xs);
  const ymin = Math.min(...ys),
    ymax = Math.max(...ys);
  const xpad = spec.kind === "distribution" ? 0 : (xmax - xmin || Math.abs(xmin) || 1) * 0.1;
  const ypad = (ymax - ymin || Math.abs(ymin) || 1) * 0.1;
  const xDomain: [number, number] = [xmin - xpad, xmax + xpad],
    yDomain: [number, number] = [ymin - ypad, ymax + ypad];
  const yticks =
    spec.kind === "map" ? [...new Set(ys)].sort((a, b) => a - b) : niceTicks(...yDomain);
  const bottom = 60 + 15 * wrapText(spec.legend).length + 16;
  const frame: Frame = {
    width: 640,
    height: 44 + 320 + bottom,
    left: Math.max(64, ...yticks.map((v) => textWidth(format(v), 12) + 28)),
    right: 32,
    top: 44,
    bottom,
  };
  const sx = linear(xDomain, [frame.left, frame.width - frame.right]),
    sy = linear(yDomain, [frame.height - frame.bottom, frame.top]);
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata)];
  parts.push(
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      weight: 600,
      size: 14,
      figure: "title",
    }),
  );
  for (const tick of yticks) {
    const y = sy(tick);
    if (y < frame.top || y > frame.height - frame.bottom) continue;
    parts.push(
      line(frame.left, y, frame.width - frame.right, y, mode, { role: "rule" }),
      text(
        frame.left - 8,
        y + 4,
        format(Math.abs(tick) <= 1e-12 * (yDomain[1] - yDomain[0]) ? 0 : tick),
        mode,
        { anchor: "end", role: "inkSecondary" },
      ),
    );
  }
  const xticks =
    spec.kind === "distribution" ? niceTicks(...xDomain) : [...new Set(xs)].sort((a, b) => a - b);
  for (const tick of xticks) {
    const x = sx(tick);
    if (x < frame.left || x > frame.width - frame.right) continue;
    parts.push(
      text(
        x,
        frame.height - frame.bottom + 20,
        format(Math.abs(tick) <= 1e-12 * (xDomain[1] - xDomain[0]) ? 0 : tick),
        mode,
        { role: "inkSecondary" },
      ),
    );
  }
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 42,
      spec.xLabel,
      mode,
      { figure: "xLabel" },
    ),
    text(16, (frame.top + frame.height - frame.bottom) / 2, spec.yLabel, mode, {
      rotate: -90,
      figure: "yLabel",
    }),
  );
  const marks: string[] = [];
  if (spec.kind === "distribution") {
    const first = spec.points[0];
    if (first) {
      let path = `M${n(sx(0))} ${n(sy(first.y))}`,
        previous = 0;
      for (const point of spec.points) {
        path += `L${n(sx(previous))} ${n(sy(point.y))}L${n(sx(point.x))} ${n(sy(point.y))}`;
        previous = point.x;
      }
      marks.push(
        `<path d="${path}" fill="none" stroke="${paint("action", mode)}" stroke-width="2"/>`,
      );
    }
  } else {
    const points = [...spec.points].sort((a, b) => a.x - b.x);
    if (spec.kind === "curve")
      marks.push(
        `<path d="${points.map((p, i) => `${i ? "L" : "M"}${n(sx(p.x))} ${n(sy(p.y))}`).join("")}" fill="none" stroke="${paint("action", mode)}" stroke-width="1.5"/>`,
      );
    const [lo, hi] = spec.colorDomain ?? [
      Math.min(...points.map((p) => p.value)),
      Math.max(...points.map((p) => p.value)),
    ];
    for (const point of points) {
      const x = sx(point.x),
        y = sy(point.y),
        shade = hi > lo ? 0.2 + (0.8 * (point.value - lo)) / (hi - lo) : 1;
      marks.push(
        `<circle cx="${n(x)}" cy="${n(y)}" r="5" fill="${paint("action", mode)}" fill-opacity="${n(shade)}" stroke="${paint("ink", mode)}" stroke-width="0.8"><title>${esc(point.label)}</title></circle>`,
      );
      if (spec.kind === "map") {
        const content = format(point.value),
          width = textWidth(content, 12);
        const tx = Math.max(
          frame.left + width / 2 + 4,
          Math.min(frame.width - frame.right - width / 2 - 4, x),
        );
        marks.push(text(tx, y < frame.top + 20 ? y + 19 : y - 10, content, mode, { size: 12 }));
      }
    }
  }
  parts.push(dataMarks(spec.id, marks.join("")), legend(frame, [spec.legend], mode), close());
  return parts.join("");
}
