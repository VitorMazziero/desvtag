// Pareto dos efeitos (U09): barras horizontais em ordem decrescente e linha de referência.
import {
  close,
  DEFAULT_FRAME,
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
} from "./svg";

export interface ParetoBarSpec {
  label: string;
  value: number;
  significant: boolean | null;
}

export interface ParetoSpec {
  id: string;
  title: string;
  description: string;
  /** Rótulo do eixo (o que as barras medem). */
  axisLabel: string;
  /** Rótulo da linha de referência (ex.: "t crítico (α = 0,05)"); ausente sem referência. */
  referenceLabel: string | null;
  reference: number | null;
  legend: string;
  bars: ParetoBarSpec[];
  metadata?: string;
}

export function paretoChart(
  spec: ParetoSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const rowHeight = 24;
  const frame: Frame = {
    ...DEFAULT_FRAME,
    left: 150,
    height: Math.max(220, 90 + spec.bars.length * rowHeight + 40),
    top: 40,
    bottom: 76,
  };
  const max = Math.max(1e-12, ...spec.bars.map((b) => b.value), spec.reference ?? 0);
  const ticks = niceTicks(0, max * 1.05);
  const top = Math.max(max * 1.05, ticks[ticks.length - 1] ?? max);
  const x = linear([0, top], [frame.left, frame.width - frame.right]);
  const plotBottom = frame.height - frame.bottom;
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata)];
  parts.push(
    text(16, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  for (const tick of ticks) {
    parts.push(line(x(tick), frame.top, x(tick), plotBottom, mode));
    parts.push(text(x(tick), plotBottom + 16, format(tick), mode, { role: "inkSecondary" }));
  }
  parts.push(
    text((frame.left + frame.width - frame.right) / 2, plotBottom + 34, spec.axisLabel, mode, {
      role: "inkSecondary",
      figure: "xLabel",
    }),
  );
  spec.bars.forEach((b, i) => {
    const y = frame.top + 8 + i * rowHeight;
    const active = b.significant === true;
    parts.push(
      `<rect x="${n(frame.left)}" y="${n(y)}" width="${n(Math.max(1, x(b.value) - frame.left))}" height="${rowHeight - 8}" ` +
        `fill="${paint(active ? "action" : "inkSecondary", mode)}" fill-opacity="${active ? 0.85 : 0.45}"/>`,
    );
    parts.push(
      text(frame.left - 8, y + rowHeight / 2 - 1, b.label, mode, { anchor: "end", size: 12 }),
    );
  });
  if (spec.reference !== null && spec.referenceLabel) {
    parts.push(
      line(x(spec.reference), frame.top, x(spec.reference), plotBottom, mode, {
        role: "alert",
        width: 1.5,
        dash: "5 3",
      }),
    );
    parts.push(
      text(x(spec.reference) + 4, frame.top + 2, spec.referenceLabel, mode, {
        anchor: "start",
        size: 11,
        role: "alert",
      }),
    );
  }
  parts.push(legend(frame, [spec.legend], mode));
  parts.push(close());
  return parts.join("");
}
