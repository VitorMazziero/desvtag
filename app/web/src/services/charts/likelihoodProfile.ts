// Geometry only: LR statistics, sampled values and confidence limits come from Rust.
import type { ParameterProfile } from "../engine";
import {
  close,
  DEFAULT_FRAME,
  dataMarks,
  esc,
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
export function likelihoodProfileChart(
  profile: ParameterProfile,
  title: string,
  xLabel: string,
  yLabel: string,
  cutoffLabel: string,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const id = `likelihood-profile-${profile.parameter}`;
  const frame = { ...DEFAULT_FRAME, height: 400, bottom: 90 };
  const ymax = profile.cutoff * 2.5;
  const central = profile.points.filter((p) => p.likelihoodRatio <= ymax);
  const xs = central.length ? central : profile.points;
  const lo = Math.min(...xs.map((p) => p.value)),
    hi = Math.max(...xs.map((p) => p.value));
  const pad = (hi - lo || Math.abs(lo) || 1) * 0.08;
  const sx = linear([Math.max(0, lo - pad), hi + pad], [frame.left, frame.width - frame.right]);
  const axis = yAxis(frame, [0, ymax], yLabel, mode, format);
  const parts = [
    open(id, frame, title, `${xLabel} · ${yLabel}`, mode),
    axis.svg,
    text(frame.left, 22, title, mode, { anchor: "start", weight: 600, size: 14, figure: "title" }),
  ];
  const xmin = Math.max(0, lo - pad),
    xmax = hi + pad;
  for (const tick of niceTicks(xmin, xmax, 4))
    if (tick >= xmin && tick <= xmax)
      parts.push(
        text(sx(tick), frame.height - frame.bottom + 20, format(tick), mode, { size: 11 }),
      );
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 44,
      xLabel,
      mode,
      { figure: "xLabel" },
    ),
  );
  const points = profile.points.filter((p) => p.value >= xmin && p.value <= xmax);
  const marks = [
    line(
      frame.left,
      axis.scale(profile.cutoff),
      frame.width - frame.right,
      axis.scale(profile.cutoff),
      mode,
      { role: "reference", dash: "6 4" },
    ),
    `<polyline points="${points.map((p) => `${n(sx(p.value))},${n(axis.scale(p.likelihoodRatio))}`).join(" ")}" fill="none" stroke="${paint("action", mode)}" stroke-width="2"/>`,
  ];
  for (const p of points)
    marks.push(
      `<circle cx="${n(sx(p.value))}" cy="${n(axis.scale(p.likelihoodRatio))}" r="2" fill="${paint("action", mode)}"><title>${esc(`${format(p.value)}: ${format(p.likelihoodRatio)}`)}</title></circle>`,
    );
  parts.push(
    dataMarks(id, marks.join("")),
    text(frame.left, frame.height - 12, `${cutoffLabel}: ${format(profile.cutoff)}`, mode, {
      anchor: "start",
      size: 11,
      role: "reference",
      figure: "legend",
    }),
    close(),
  );
  return parts.join("");
}
