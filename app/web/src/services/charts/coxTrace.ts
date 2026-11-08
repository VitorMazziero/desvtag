// Draw saved Rust predictions only. Missing estimates split curves into separate paths.
import type { CoxTrace } from "../engine";
import { wrapWidth } from "./layout";
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

const DASHES = ["", "8 4", "2 4", "10 3 2 3", "12 5", "4 3", "12 3 2 3 2 3", "6 3 1 3"];

export function coxTraceChart(
  spec: {
    id: string;
    title: string;
    xLabel: string;
    yLabel: string;
    note: string;
    names: string[];
    trace: CoxTrace;
  },
  mode: PaintMode,
  format: (value: number) => string,
): string {
  const points = spec.trace.series.flatMap((series) => series.points);
  const values = points.flatMap((point) =>
    point.value.status === "defined" ? [point.value.value] : [],
  );
  if (!values.length) return "";
  const labels = spec.trace.series.map((series) =>
    wrapWidth(`${series.component + 1}. ${spec.names[series.component] ?? ""}`, 500, 12),
  );
  const legendHeight = labels.reduce((height, lines) => height + lines.length * 17 + 5, 0);
  const frame = { ...DEFAULT_FRAME, height: 420 + legendHeight, bottom: 140 + legendHeight };
  const xs = points.map((point) => point.delta);
  const minX = Math.min(0, ...xs),
    maxX = Math.max(0, ...xs);
  const minY = Math.min(...values),
    maxY = Math.max(...values);
  const xPad = (maxX - minX || 1) * 0.05,
    yPad = (maxY - minY || 1) * 0.08;
  const x = linear([minX - xPad, maxX + xPad], [frame.left, frame.width - frame.right]);
  const axis = yAxis(frame, [minY - yPad, maxY + yPad], spec.yLabel, mode, format);
  const bottom = frame.height - frame.bottom;
  const parts = [
    open(spec.id, frame, spec.title, spec.note, mode),
    axis.svg,
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      weight: 600,
      size: 14,
      figure: "title",
    }),
  ];
  for (const tick of niceTicks(minX - xPad, maxX + xPad)) {
    const position = x(tick);
    if (position >= frame.left && position <= frame.width - frame.right)
      parts.push(
        text(position, bottom + 20, format(Object.is(tick, -0) ? 0 : tick), mode, {
          role: "inkSecondary",
        }),
      );
  }
  parts.push(
    text((frame.left + frame.width - frame.right) / 2, bottom + 46, spec.xLabel, mode, {
      role: "inkSecondary",
      figure: "xLabel",
    }),
  );
  const marks = [line(x(0), frame.top, x(0), bottom, mode, { role: "reference", dash: "3 4" })];
  for (const series of spec.trace.series) {
    const dash = DASHES[series.component] ?? "";
    let segment: string[] = [];
    const flush = () => {
      if (segment.length)
        marks.push(
          `<polyline data-cox-series="${series.component}" points="${segment.join(" ")}" fill="none" stroke="${paint("action", mode)}" stroke-width="2" stroke-dasharray="${dash}"><title>${esc(spec.names[series.component] ?? "")}</title></polyline>`,
        );
      segment = [];
    };
    for (const point of series.points) {
      if (point.value.status !== "defined") {
        flush();
        continue;
      }
      const px = n(x(point.delta)),
        py = n(axis.scale(point.value.value));
      segment.push(`${px},${py}`);
      // Dots keep isolated estimable predictions visible, without joining across gaps.
      marks.push(
        `<circle cx="${px}" cy="${py}" r="1.5" fill="${paint("action", mode)}"><title>${esc(`${spec.names[series.component] ?? ""}; Δ=${format(point.delta)}; ${format(point.value.value)}`)}</title></circle>`,
      );
    }
    flush();
  }
  parts.push(dataMarks(spec.id, marks.join("")));
  let y = bottom + 76;
  labels.forEach((lines, index) => {
    parts.push(
      line(frame.left, y - 4, frame.left + 30, y - 4, mode, {
        role: "action",
        width: 2,
        dash: DASHES[index],
      }),
    );
    for (const value of lines) {
      parts.push(text(frame.left + 40, y, value, mode, { anchor: "start" }));
      y += 17;
    }
    y += 5;
  });
  parts.push(legend(frame, [spec.note], mode), close());
  return parts.join("");
}
