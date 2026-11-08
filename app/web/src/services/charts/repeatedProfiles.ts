// Scientific series are already calculated in Rust; this module only draws geometry.
import type { AdvancedMixedResult } from "../engine";
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
export function repeatedProfilesChart(
  spec: {
    id: string;
    title: string;
    xLabel: string;
    yLabel: string;
    note: string;
    metadata: string;
    result: AdvancedMixedResult;
    unitLabel: (id: string) => string;
    timeLabel: (index: number) => string;
  },
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const frame: Frame = { ...DEFAULT_FRAME, bottom: 100 };
  const points = spec.result.profiles.filter(
    (p): p is typeof p & { time: number } => p.time !== null,
  );
  const times = points.map((p) => p.time);
  const ys = [
    ...points.map((p) => p.observed),
    ...spec.result.meanProfiles.flatMap((p) => [
      p.inference.estimate,
      ...(p.inference.ciLower.status === "defined" ? [p.inference.ciLower.value] : []),
      ...(p.inference.ciUpper.status === "defined" ? [p.inference.ciUpper.value] : []),
    ]),
  ];
  if (!points.length) return "";
  const minX = Math.min(...times),
    maxX = Math.max(...times),
    padX = (maxX - minX || 1) * 0.08;
  const minY = Math.min(...ys),
    maxY = Math.max(...ys),
    padY = (maxY - minY || 1) * 0.08;
  const x = linear([minX - padX, maxX + padX], [frame.left, frame.width - frame.right]);
  const axis = yAxis(frame, [minY - padY, maxY + padY], spec.yLabel, mode, format);
  const parts = [
    open(spec.id, frame, spec.title, spec.note, mode, spec.metadata),
    axis.svg,
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  ];
  for (const tick of niceTicks(minX - padX, maxX + padX)) {
    const position = x(tick);
    if (position < frame.left || position > frame.width - frame.right) continue;
    parts.push(
      text(position, frame.height - frame.bottom + 18, format(tick), mode, {
        role: "inkSecondary",
      }),
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
  const marks: string[] = [];
  const units = new Map<string, typeof points>();
  for (const point of points) {
    const group = units.get(point.unit) ?? [];
    group.push(point);
    units.set(point.unit, group);
  }
  for (const [unit, group] of units) {
    group.sort((a, b) => a.time - b.time);
    marks.push(
      `<polyline points="${group.map((p) => `${n(x(p.time))},${n(axis.scale(p.observed))}`).join(" ")}" fill="none" stroke="${paint("uncertainty", mode)}" stroke-opacity="0.55" stroke-width="1"><title>${esc(spec.unitLabel(unit))}</title></polyline>`,
    );
    for (const p of group)
      marks.push(
        `<circle cx="${n(x(p.time))}" cy="${n(axis.scale(p.observed))}" r="2.5" fill="${paint("uncertainty", mode)}"><title>${esc(`${spec.unitLabel(unit)}; ${spec.timeLabel(p.time)}; ${spec.yLabel}=${format(p.observed)}`)}</title></circle>`,
      );
  }
  const means = spec.result.meanProfiles;
  marks.push(
    `<polyline points="${means.map((p) => `${n(x(p.time))},${n(axis.scale(p.inference.estimate))}`).join(" ")}" fill="none" stroke="${paint("action", mode)}" stroke-width="2.5"/>`,
  );
  for (const p of means) {
    if (p.inference.ciLower.status === "defined" && p.inference.ciUpper.status === "defined") {
      const position = x(p.time),
        lo = axis.scale(p.inference.ciLower.value),
        hi = axis.scale(p.inference.ciUpper.value);
      marks.push(
        line(position, lo, position, hi, mode, { role: "action" }),
        line(position - 4, lo, position + 4, lo, mode, { role: "action" }),
        line(position - 4, hi, position + 4, hi, mode, { role: "action" }),
      );
    }
    marks.push(
      `<circle cx="${n(x(p.time))}" cy="${n(axis.scale(p.inference.estimate))}" r="4" fill="${paint("action", mode)}"><title>${esc(`${spec.timeLabel(p.time)}; ${format(p.inference.estimate)}; n=${p.n}; ${p.units}`)}</title></circle>`,
    );
  }
  parts.push(dataMarks(spec.id, marks.join("")));
  const mapping = spec.result.timeLabels.map((p) => `${format(p.index)} = ${p.label}`).join("; ");
  parts.push(legend(frame, [spec.note, ...(mapping ? [mapping] : [])], mode), close());
  return parts.join("");
}
