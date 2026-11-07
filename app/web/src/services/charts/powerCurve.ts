// Geometry only. Every power estimate and Monte Carlo bound is supplied by Rust.
import type { PowerResult } from "../engine";
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
export interface PowerCurveSpec {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  analyticLabel: string;
  simulationLabel: string;
  targetLabel: string;
  result: PowerResult;
  target?: number;
  metadata: string;
}
export function powerCurveChart(
  spec: PowerCurveSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const result = spec.result;
  const frame = { ...DEFAULT_FRAME, height: 440, bottom: 120 };
  const xmax = Math.max(result.n, ...result.curve.map((p) => p.n), 2);
  const sx = linear([0, xmax * 1.04], [frame.left, frame.width - frame.right]);
  // Keep endpoint markers inside the frame without labeling impossible probabilities.
  const axis = yAxis(frame, [-0.03, 1.03], spec.yLabel, mode, format, [0, 0.2, 0.4, 0.6, 0.8, 1]);
  const parts = [
    open(spec.id, frame, spec.title, `${spec.xLabel} · ${spec.yLabel}`, mode, spec.metadata),
    axis.svg,
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      weight: 600,
      size: 14,
      figure: "title",
    }),
  ];
  for (const tick of niceTicks(0, xmax, 4))
    if (tick >= 0 && tick <= xmax && Number.isInteger(tick))
      parts.push(
        text(sx(tick), frame.height - frame.bottom + 22, format(tick), mode, { size: 11 }),
      );
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 44,
      spec.xLabel,
      mode,
      { figure: "xLabel" },
    ),
  );
  const marks = [
    `<polyline points="${result.curve.map((p) => `${n(sx(p.n))},${n(axis.scale(p.power))}`).join(" ")}" fill="none" stroke="${paint("action", mode)}" stroke-width="2"/>`,
  ];
  if (result.power.status === "defined") {
    const x = sx(result.n),
      y = axis.scale(result.power.value);
    marks.push(
      `<polygon points="${n(x)},${n(y - 4)} ${n(x + 4)},${n(y)} ${n(x)},${n(y + 4)} ${n(x - 4)},${n(y)}" fill="${paint("panel", mode)}" stroke="${paint("action", mode)}" stroke-width="2"><title>${esc(`${spec.analyticLabel}: n=${result.n}; ${result.power.value}`)}</title></polygon>`,
    );
  }
  if (spec.target !== undefined)
    marks.push(
      line(
        frame.left,
        axis.scale(spec.target),
        frame.width - frame.right,
        axis.scale(spec.target),
        mode,
        { role: "reference", dash: "6 4" },
      ),
    );
  if (result.simulation) {
    const sim = result.simulation,
      x = sx(result.n),
      low = axis.scale(sim.ciLower),
      high = axis.scale(sim.ciUpper),
      y = axis.scale(sim.estimate);
    marks.push(
      `<g stroke="${paint("reference", mode)}" fill="none" stroke-width="2"><title>${esc(`${spec.simulationLabel}: ${sim.estimate}; [${sim.ciLower}; ${sim.ciUpper}]; B=${sim.replications}; seed=${sim.seed}`)}</title><path d="M${n(x)},${n(low)}V${n(high)}M${n(x - 5)},${n(low)}H${n(x + 5)}M${n(x - 5)},${n(high)}H${n(x + 5)}M${n(x - 4)},${n(y - 4)}L${n(x + 4)},${n(y + 4)}M${n(x - 4)},${n(y + 4)}L${n(x + 4)},${n(y - 4)}"/></g>`,
    );
  }
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
    legend(
      frame,
      [
        spec.analyticLabel,
        ...(result.simulation ? [spec.simulationLabel] : []),
        ...(spec.target !== undefined ? [`${spec.targetLabel}: ${format(spec.target)}`] : []),
      ],
      mode,
    ),
    close(),
  );
  return parts.join("");
}
