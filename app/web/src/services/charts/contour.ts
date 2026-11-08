import { textWidth } from "./layout";
// Gráfico de contorno (U09): malha colorida por intensidade, curvas de nível do motor, região
// extrapolada hachurada e pontos do planejamento. Nenhum valor é calculado aqui.

import { cellExtrapolated, hatch, type SurfaceChartSpec, valueAt, zRange } from "./surfaceGeometry";
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
    right: 100,
    top: 44,
    bottom: 56 + 15 * noteLines + 16,
  };
  const x0 = grid.x[0] ?? 0;
  const x1 = grid.x[grid.x.length - 1] ?? 1;
  const y0 = grid.y[0] ?? 0;
  const y1 = grid.y[grid.y.length - 1] ?? 1;
  const sx = linear([x0, x1], [frame.left, frame.width - frame.right]);
  const sy = linear([y0, y1], [frame.height - frame.bottom, frame.top]);
  const [zLo, zHi] = spec.colorDomain ?? zRange(grid);
  const displayLo = spec.colorDomain?.[0] ?? grid.zMin ?? zLo,
    displayHi = spec.colorDomain?.[1] ?? grid.zMax ?? zHi;
  const parts = [open(spec.id, frame, spec.title, spec.description, mode, spec.metadata)];
  parts.push(hatch(spec.id, paint("alert", mode)));
  parts.push(
    text(frame.left, 22, spec.title, mode, {
      anchor: "start",
      size: 14,
      weight: 600,
      figure: "title",
    }),
  );
  const cells: string[] = [];
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
        cells.push(
          `<rect x="${n(left)}" y="${n(top)}" width="${w}" height="${h}" shape-rendering="crispEdges" fill="${paint("action", mode)}" ` +
            `fill-opacity="${n(0.06 + 0.5 * ((v - zLo) / (zHi - zLo)))}"/>`,
        );
      if (cellExtrapolated(grid, iy, ix))
        cells.push(
          `<rect x="${n(left)}" y="${n(top)}" width="${w}" height="${h}" fill="url(#${spec.id}-hatch)" fill-opacity="0.55"/>`,
        );
    }
  }
  parts.push(dataMarks(spec.id, cells.join("")));
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
        figure: "xLabel",
      },
    ),
  );
  parts.push(
    text(16, (frame.top + frame.height - frame.bottom) / 2, grid.yName, mode, {
      rotate: -90,
      role: "inkSecondary",
      figure: "yLabel",
    }),
  );
  const marks: string[] = [];
  // Choose separated label anchors from the engine segments; never stack contour values.
  const contourLabels: Array<{ x: number; y: number; width: number }> = [];
  for (const c of grid.contours) {
    if (c.segments.length === 0) continue;
    const d = c.segments
      .map((s) => `M${n(sx(s.x1))} ${n(sy(s.y1))}L${n(sx(s.x2))} ${n(sy(s.y2))}`)
      .join("");
    marks.push(
      `<path d="${d}" fill="none" stroke="${paint("ink", mode)}" stroke-width="0.7" stroke-opacity="0.6"/>`,
    );
    const width = textWidth(format(c.level), 12) + 8;
    // Deterministic traversal spreads nearby levels over their curves, including sharp plateaus.
    for (let i = 0; i < c.segments.length; i++) {
      const segment = c.segments[(Math.floor(c.segments.length / 2) + i) % c.segments.length]!;
      const x = Math.max(
        frame.left + width / 2 + 6,
        Math.min(frame.width - frame.right - width / 2 - 6, (sx(segment.x1) + sx(segment.x2)) / 2),
      );
      const y = Math.max(
        frame.top + 16,
        Math.min(frame.height - frame.bottom - 8, (sy(segment.y1) + sy(segment.y2)) / 2 - 3),
      );
      if (
        contourLabels.some(
          (p) => Math.abs(p.x - x) < (p.width + width) / 2 + 8 && Math.abs(p.y - y) < 24,
        )
      )
        continue;
      contourLabels.push({ x, y, width });
      marks.push(
        text(x, y, format(c.level), mode, { size: 12, halo: true }).replace(
          "<text ",
          '<text data-contour-label="true" ',
        ),
      );
      break;
    }
  }
  const labels: Array<{ x: number; y: number; width: number; height: number }> = [];
  for (const p of spec.points ?? []) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    marks.push(
      `<circle cx="${n(sx(p.x))}" cy="${n(sy(p.y))}" r="${p.selected ? 5 : 3.5}" fill="${paint("panel", mode)}" ` +
        `stroke="${paint("ink", mode)}" stroke-width="${p.selected ? 2 : 1.2}"><title>${esc(`${p.label ?? ""}: ${format(p.x)}; ${format(p.y)}`)}</title></circle>`,
    );
    if (p.label) {
      const width = textWidth(p.label, 14.4) + 8;
      const x = Math.min(
        frame.width - frame.right - width - 4,
        Math.max(frame.left + 4, sx(p.x) + 8),
      );
      const initial = Math.min(
        frame.height - frame.bottom - 8,
        Math.max(frame.top + 18, sy(p.y) - 8),
      );
      let y = initial;
      const overlaps = (y: number) =>
        [
          ...labels,
          ...contourLabels.map((p) => ({
            x: p.x - p.width / 2,
            y: p.y,
            width: p.width,
            height: 20,
          })),
        ].some((b) => x < b.x + b.width && x + width > b.x && y - 18 < b.y && y > b.y - b.height);
      for (let shift = 0; overlaps(y) && shift < 20; shift++) {
        const delta = (Math.floor(shift / 2) + 1) * 24;
        y = shift % 2 === 0 ? initial + delta : initial - delta;
        if (y < frame.top + 18 || y > frame.height - frame.bottom - 4) y = initial;
      }
      labels.push({ x, y, width, height: 20 });
      marks.push(line(sx(p.x), sy(p.y), x, y - 5, mode, { role: "ink", width: 0.7 }));
      marks.push(
        text(x + 4, y, p.label, mode, {
          anchor: "start",
          halo: true,
          size: 12,
          weight: 600,
        }).replace("<text ", '<text data-candidate-label="true" '),
      );
    }
  }
  parts.push(dataMarks(spec.id, marks.join("")));
  const barX = frame.width - frame.right + 24,
    barY = frame.top,
    barH = frame.height - frame.top - frame.bottom;
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    parts.push(
      `<rect data-color-scale="true" x="${barX}" y="${n(barY + barH * (1 - t))}" width="14" height="${n(barH / 59 + 0.5)}" fill="${paint("action", mode)}" fill-opacity="${n(0.06 + 0.5 * (displayHi > displayLo ? t : 0))}"/>`,
    );
  }
  for (const t of displayHi > displayLo ? [0, 0.25, 0.5, 0.75, 1] : [0.5])
    parts.push(
      text(
        barX + 20,
        barY + barH * (1 - t) + 4,
        format(displayLo + (displayHi - displayLo) * t),
        mode,
        {
          anchor: "start",
          size: 11,
          role: "inkSecondary",
        },
      ),
    );
  parts.push(legend(frame, notes, mode));
  parts.push(close());
  return parts.join("").replace("<svg ", `<svg data-color-domain="${displayLo} ${displayHi}" `);
}
