// Gráfico de contorno (U09): malha colorida por intensidade, curvas de nível do motor, região
// extrapolada hachurada e pontos do planejamento. Nenhum valor é calculado aqui.

import { hatch, type SurfaceChartSpec, valueAt, zRange } from "./surfaceGeometry";
import {
  close,
  type Frame,
  legend,
  linear,
  n,
  niceTicks,
  open,
  type PaintMode,
  paint,
  text,
  wrapText,
} from "./svg";

export function contourChart(
  spec: SurfaceChartSpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const { grid } = spec;
  const fixed = grid.fixed.map((f) => `${f.name} = ${format(f.value)}`).join("; ");
  const notes = [
    `${spec.responseLabel}. ${spec.texts.reading}`,
    ...(fixed ? [fixed] : []),
    ...(grid.extrapolated.some((row) => row.some(Boolean)) ? [spec.texts.extrapolated] : []),
    ...((spec.points?.length ?? 0) > 0 ? [spec.texts.points] : []),
  ];
  const noteLines = notes.flatMap((c) => wrapText(c)).length;
  // O rodapé cresce com a legenda: eixo (56 px) + linhas de 15 px + margem.
  const frame: Frame = {
    width: 640,
    height: 44 + 300 + 56 + 15 * noteLines + 16,
    left: 64,
    right: 24,
    top: 44,
    bottom: 56 + 15 * noteLines + 16,
  };
  const x0 = grid.x[0] ?? 0;
  const x1 = grid.x[grid.x.length - 1] ?? 1;
  const y0 = grid.y[0] ?? 0;
  const y1 = grid.y[grid.y.length - 1] ?? 1;
  const sx = linear([x0, x1], [frame.left, frame.width - frame.right]);
  const sy = linear([y0, y1], [frame.height - frame.bottom, frame.top]);
  const [zLo, zHi] = zRange(grid);
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata)];
  parts.push(hatch(spec.id, paint("alert", mode)));
  parts.push(text(frame.left, 22, spec.title, mode, { anchor: "start", size: 14, weight: 600 }));
  // Células: intensidade proporcional à resposta; hachura onde há extrapolação.
  for (let iy = 0; iy < grid.y.length - 1; iy++) {
    for (let ix = 0; ix < grid.x.length - 1; ix++) {
      const v = valueAt(grid, iy, ix);
      const left = sx(grid.x[ix] ?? 0);
      const right = sx(grid.x[ix + 1] ?? 0);
      const top = sy(grid.y[iy + 1] ?? 0);
      const bottom = sy(grid.y[iy] ?? 0);
      const w = n(right - left);
      const h = n(bottom - top);
      if (v !== null)
        parts.push(
          `<rect x="${n(left)}" y="${n(top)}" width="${w}" height="${h}" shape-rendering="crispEdges" fill="${paint("action", mode)}" ` +
            `fill-opacity="${n(0.06 + 0.5 * ((v - zLo) / (zHi - zLo)))}"/>`,
        );
      if (grid.extrapolated[iy]?.[ix])
        parts.push(
          `<rect x="${n(left)}" y="${n(top)}" width="${w}" height="${h}" fill="url(#${spec.id}-hatch)" fill-opacity="0.55"/>`,
        );
    }
  }
  // Eixos e marcas.
  parts.push(
    `<rect x="${frame.left}" y="${frame.top}" width="${frame.width - frame.left - frame.right}" ` +
      `height="${frame.height - frame.top - frame.bottom}" fill="none" stroke="${paint("rule", mode)}"/>`,
  );
  for (const tick of niceTicks(x0, x1)) {
    if (tick < x0 || tick > x1) continue;
    parts.push(
      text(sx(tick), frame.height - frame.bottom + 18, format(tick), mode, {
        role: "inkSecondary",
      }),
    );
  }
  for (const tick of niceTicks(y0, y1)) {
    if (tick < y0 || tick > y1) continue;
    parts.push(
      text(frame.left - 8, sy(tick) + 4, format(tick), mode, {
        anchor: "end",
        role: "inkSecondary",
      }),
    );
  }
  parts.push(
    text(
      (frame.left + frame.width - frame.right) / 2,
      frame.height - frame.bottom + 40,
      grid.xName,
      mode,
      {
        role: "inkSecondary",
      },
    ),
  );
  parts.push(
    text(16, (frame.top + frame.height - frame.bottom) / 2, grid.yName, mode, {
      rotate: -90,
      role: "inkSecondary",
    }),
  );
  // Curvas de nível (segmentos do motor) e um rótulo por curva.
  for (const c of grid.contours) {
    if (c.segments.length === 0) continue;
    const d = c.segments
      .map((s) => `M${n(sx(s.x1))} ${n(sy(s.y1))}L${n(sx(s.x2))} ${n(sy(s.y2))}`)
      .join("");
    parts.push(`<path d="${d}" fill="none" stroke="${paint("ink", mode)}" stroke-width="1.2"/>`);
    const mid = c.segments[Math.floor(c.segments.length / 2)];
    if (mid)
      parts.push(
        text(
          (sx(mid.x1) + sx(mid.x2)) / 2,
          (sy(mid.y1) + sy(mid.y2)) / 2 - 3,
          format(c.level),
          mode,
          {
            size: 10,
          },
        ),
      );
  }
  for (const p of spec.points ?? []) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    parts.push(
      `<circle cx="${n(sx(p.x))}" cy="${n(sy(p.y))}" r="3.5" fill="${paint("panel", mode)}" ` +
        `stroke="${paint("ink", mode)}" stroke-width="1.2"/>`,
    );
  }
  parts.push(legend(frame, notes, mode));
  parts.push(close());
  return parts.join("");
}
