// Superfície em projeção ortogonal (U09): malha de quadriláteros ordenados por profundidade, com
// azimute e elevação ajustáveis. É apenas geometria de desenho sobre a malha calculada no motor.

import { cellExtrapolated, hatch, type SurfaceChartSpec, valueAt, zRange } from "./surfaceGeometry";
import { close, type Frame, legend, line, n, open, type PaintMode, paint, text } from "./svg";

export interface View3d {
  /** Azimute em graus (rotação em torno do eixo vertical). */
  azimuth: number;
  /** Elevação em graus (0 = de lado, 90 = de cima). */
  elevation: number;
}

export const DEFAULT_VIEW: View3d = { azimuth: 35, elevation: 30 };

export function surface3dChart(
  spec: SurfaceChartSpec,
  view: View3d,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const { grid } = spec;
  const frame: Frame = { width: 640, height: 480, left: 40, right: 40, top: 44, bottom: 112 };
  const [zLo, zHi] = zRange(grid);
  const nx = grid.x.length;
  const ny = grid.y.length;
  const a = (view.azimuth * Math.PI) / 180;
  const e = (view.elevation * Math.PI) / 180;
  // Coordenadas normalizadas: x, y em [−1, 1]; z em [−0,7; 0,7].
  const norm = (i: number, count: number) => (count > 1 ? (2 * i) / (count - 1) - 1 : 0);
  const zn = (v: number) => 1.4 * ((v - zLo) / (zHi - zLo)) - 0.7;
  const project = (x: number, y: number, z: number) => {
    const xr = x * Math.cos(a) - y * Math.sin(a);
    const depth = x * Math.sin(a) + y * Math.cos(a);
    return { u: xr, v: z * Math.cos(e) + depth * Math.sin(e), depth };
  };
  // Escala para caber no quadro.
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) => [-0.7, 0.7].map((z) => project(x, y, z))),
  );
  const uMax = Math.max(...corners.map((c) => Math.abs(c.u)));
  const vMin = Math.min(...corners.map((c) => c.v));
  const vMax = Math.max(...corners.map((c) => c.v));
  const availableW = frame.width - frame.left - frame.right;
  const availableH = frame.height - frame.top - frame.bottom;
  const scale = Math.min(availableW / (2 * uMax), availableH / (vMax - vMin));
  const cx = frame.left + availableW / 2;
  const cy = frame.top + availableH / 2 + ((vMax + vMin) / 2) * scale;
  const screen = (x: number, y: number, z: number) => {
    const p = project(x, y, z);
    return { px: cx + p.u * scale, py: cy - p.v * scale, depth: p.depth };
  };

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

  // Quadriláteros do mais distante ao mais próximo.
  const quads: Array<{ depth: number; svg: string }> = [];
  for (let iy = 0; iy < ny - 1; iy++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const values = [
        valueAt(grid, iy, ix),
        valueAt(grid, iy, ix + 1),
        valueAt(grid, iy + 1, ix + 1),
        valueAt(grid, iy + 1, ix),
      ];
      if (values.some((v) => v === null)) continue;
      const pts = [
        screen(norm(ix, nx), norm(iy, ny), zn(values[0] ?? 0)),
        screen(norm(ix + 1, nx), norm(iy, ny), zn(values[1] ?? 0)),
        screen(norm(ix + 1, nx), norm(iy + 1, ny), zn(values[2] ?? 0)),
        screen(norm(ix, nx), norm(iy + 1, ny), zn(values[3] ?? 0)),
      ];
      const mean = values.reduce<number>((s, v) => s + (v ?? 0), 0) / 4;
      const points = pts.map((p) => `${n(p.px)},${n(p.py)}`).join(" ");
      const intensity = n(0.1 + 0.6 * ((mean - zLo) / (zHi - zLo)));
      let svg = `<polygon points="${points}" fill="${paint("action", mode)}" fill-opacity="${intensity}" stroke="${paint("ink", mode)}" stroke-opacity="0.35" stroke-width="0.5"/>`;
      if (cellExtrapolated(grid, iy, ix))
        svg += `<polygon points="${points}" fill="url(#${spec.id}-hatch)" fill-opacity="0.6"/>`;
      quads.push({ depth: pts.reduce((s, p) => s + p.depth, 0) / 4, svg });
    }
  }
  quads.sort((p, q) => q.depth - p.depth);
  parts.push(...quads.map((q) => q.svg));

  // Eixos a partir do canto (x mín., y mín., z mín.).
  const origin = screen(-1, -1, -0.7);
  const ex = screen(1, -1, -0.7);
  const ey = screen(-1, 1, -0.7);
  const ez = screen(-1, -1, 0.7);
  for (const end of [ex, ey, ez])
    parts.push(line(origin.px, origin.py, end.px, end.py, mode, { role: "ink", width: 1.4 }));
  const label = (
    p: { px: number; py: number },
    content: string,
    anchor: "start" | "end" | "middle",
  ) => text(p.px, p.py, content, mode, { anchor, size: 11, role: "ink", halo: true });
  const x0 = grid.x[0] ?? 0;
  const x1 = grid.x[nx - 1] ?? 0;
  const y0 = grid.y[0] ?? 0;
  const y1 = grid.y[ny - 1] ?? 0;
  // Cada eixo recebe o nome e o intervalo (do canto de origem até a ponta), uma vez.
  parts.push(
    label({ px: ex.px, py: ex.py + 16 }, `${grid.xName}: ${format(x0)} → ${format(x1)}`, "middle"),
  );
  parts.push(
    label({ px: ey.px, py: ey.py + 16 }, `${grid.yName}: ${format(y0)} → ${format(y1)}`, "middle"),
  );
  parts.push(
    label(
      { px: ez.px, py: ez.py - 10 },
      `${spec.responseLabel}: ${format(zLo)} → ${format(zHi)}`,
      "middle",
    ),
  );

  const fixed = grid.fixed.map((f) => `${f.name} = ${format(f.value)}`).join("; ");
  parts.push(
    legend(
      frame,
      [
        `${spec.responseLabel}. ${spec.texts.reading}`,
        ...(fixed ? [fixed] : []),
        ...(grid.extrapolated.some((row) => row.some(Boolean)) ? [spec.texts.extrapolated] : []),
      ],
      mode,
    ),
  );
  parts.push(close());
  return parts.join("");
}
