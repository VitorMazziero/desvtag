import type { MixtureGridPoint } from "../engine";
import { wrapWidth } from "./layout";
import { close, dataMarks, esc, legend, line, n, open, type PaintMode, paint, text } from "./svg";

const STOPS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const H = Math.sqrt(3) / 2;
const W = 640;
const PAD = 80;

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => Number.parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => Number.parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + ((pb[i] ?? 0) - v) * t)).join(",")})`;
}

export function colorAt(t: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const scaled = clamped * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(scaled));
  return mix(STOPS[i] as string, STOPS[i + 1] as string, scaled - i);
}

export interface TernarySpec {
  id: string;
  title: string;
  names: string[];
  grid: MixtureGridPoint[];
  points: number[][];
  note: string;
  minLabel: string;
  maxLabel: string;
  divisions?: number;
  boundary?: number[][][];
  highlight?: number[];
}
export function ternaryChart(
  spec: TernarySpec,
  mode: PaintMode,
  format: (v: number) => string,
): string {
  const { names, grid, points } = spec;
  const nameLines = names.map((v) => wrapWidth(v, 220, 12));
  const top = 100 + Math.max(0, (nameLines[0]?.length ?? 1) - 1) * 16;
  const size = W - 2 * PAD;
  const toXY = (p: number[]): [number, number] => {
    const [p1 = 0, p2 = 0, p3 = 0] = p;
    return [PAD + (p1 * 0.5 + p3 * 1) * size, top + (p2 * H + p3 * H) * size];
  };
  if (grid.length === 0) return "";
  const m = spec.divisions ?? Math.round(Math.sqrt(grid.length * 2)) - 1;
  const values = new Map<string, number>();
  for (const g of grid) {
    const a = Math.round((g.pseudo[0] ?? 0) * m);
    const b = Math.round((g.pseudo[1] ?? 0) * m);
    values.set(`${a},${b}`, g.value);
  }
  const lo = Math.min(...grid.map((g) => g.value));
  const hi = Math.max(...grid.map((g) => g.value));
  const span = hi - lo || 1;
  const at = (a: number, b: number) => toXY([a / m, b / m, (m - a - b) / m]);
  const cells: { key: string; points: string; fill: string }[] = [];
  for (let a = 0; a < m; a++) {
    for (let b = 0; a + b < m; b++) {
      const up = [
        [a, b],
        [a + 1, b],
        [a, b + 1],
      ] as const;
      const mean = (corners: readonly (readonly [number, number])[]) =>
        corners.reduce((s, [x, y]) => s + (values.get(`${x},${y}`) as number), 0) / corners.length;
      if (up.every(([x, y]) => values.has(`${x},${y}`)))
        cells.push({
          key: `u${a},${b}`,
          points: up.map(([x, y]) => at(x, y).join(",")).join(" "),
          fill: colorAt((mean(up) - lo) / span),
        });
      if (a + b + 1 < m) {
        const down = [
          [a + 1, b],
          [a, b + 1],
          [a + 1, b + 1],
        ] as const;
        if (down.every(([x, y]) => values.has(`${x},${y}`)))
          cells.push({
            key: `d${a},${b}`,
            points: down.map(([x, y]) => at(x, y).join(",")).join(" "),
            fill: colorAt((mean(down) - lo) / span),
          });
      }
    }
  }
  const [v1x, v1y] = toXY([1, 0, 0]);
  const [v2x, v2y] = toXY([0, 1, 0]);
  const [v3x, v3y] = toXY([0, 0, 1]);

  const bottomLines = Math.max(1, nameLines[1]?.length ?? 1, nameLines[2]?.length ?? 1);
  const frame = {
    width: W,
    height: Math.ceil(top + size * H + 110 + bottomLines * 16),
    left: 40,
    right: 40,
    top: 44,
    bottom: 100,
  };
  const parts = [
    open(spec.id, frame, spec.title, spec.note, mode),
    text(40, 22, spec.title, mode, { figure: "title", anchor: "start", weight: 600, size: 14 }),
  ];
  parts.push(
    dataMarks(
      spec.id,
      cells
        .map(
          (c) =>
            `<polygon points="${c.points}" fill="${c.fill}" stroke="${c.fill}" stroke-width="0.4"/>`,
        )
        .join(""),
    ),
  );
  for (const [a, b] of spec.boundary ?? []) {
    if (!a || !b) continue;
    const start = toXY(a),
      end = toXY(b);
    parts.push(
      line(start[0], start[1], end[0], end[1], mode, { role: "ink", width: 1.8, dash: "5 3" }),
    );
  }
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    for (const [a, b] of [
      [
        [t, 1 - t, 0],
        [t, 0, 1 - t],
      ],
      [
        [1 - t, t, 0],
        [0, t, 1 - t],
      ],
      [
        [1 - t, 0, t],
        [0, 1 - t, t],
      ],
    ]) {
      const p = toXY(a!),
        q = toXY(b!);
      parts.push(line(p[0], p[1], q[0], q[1], mode, { grid: true }));
    }
    const p1 = toXY([t, 1 - t, 0]),
      p2 = toXY([0, t, 1 - t]),
      p3 = toXY([1 - t, 0, t]);
    parts.push(text(p1[0] - 10, p1[1], format(t), mode, { anchor: "end", size: 11 }));
    parts.push(text(p2[0], p2[1] + 16, format(t), mode, { size: 11 }));
    parts.push(text(p3[0] + 10, p3[1], format(t), mode, { anchor: "start", size: 11 }));
  }
  parts.push(
    `<polygon points="${v1x},${v1y} ${v2x},${v2y} ${v3x},${v3y}" fill="none" stroke="${paint("ink", mode)}" stroke-width="1.2"/>`,
  );
  points.forEach((p, i) => {
    const [x, y] = toXY(p);
    parts.push(
      `<circle cx="${n(x)}" cy="${n(y)}" r="3.5" fill="white" stroke="black" stroke-width="1"><title>${esc(`${i + 1}: ${p.map(format).join("; ")}`)}</title></circle>`,
    );
  });
  if (spec.highlight) {
    const [x, y] = toXY(spec.highlight);
    parts.push(
      `<path data-mixture-optimum="true" d="M${n(x)},${n(y - 7)} L${n(x + 7)},${n(y)} L${n(x)},${n(y + 7)} L${n(x - 7)},${n(y)} Z" fill="${paint("action", mode)}" stroke="${paint("panel", mode)}" stroke-width="2"/>`,
    );
  }
  nameLines.forEach(
    (lines, i) =>
      void lines.forEach(
        (value, j) =>
          void parts.push(
            text(
              i === 0 ? v1x : i === 1 ? v2x : v3x,
              i === 0 ? top - 12 - (lines.length - 1 - j) * 16 : v2y + 38 + j * 16,
              value,
              mode,
              { anchor: i === 0 ? "middle" : i === 1 ? "start" : "end", size: 12 },
            ),
          ),
      ),
  );
  const barX = 140,
    barW = 360,
    barY = v2y + 54 + bottomLines * 16;
  for (let i = 0; i < 60; i++)
    parts.push(
      `<rect data-color-scale="true" x="${barX + (i * barW) / 60}" y="${barY}" width="${barW / 60 + 0.5}" height="12" fill="${colorAt(hi > lo ? i / 59 : 0)}"/>`,
    );
  for (const t of hi > lo ? [0, 0.25, 0.5, 0.75, 1] : [0.5])
    parts.push(text(barX + t * barW, barY + 28, format(lo + (hi - lo) * t), mode, { size: 11 }));
  parts.push(legend(frame, [spec.note], mode), close());
  return parts.join("").replace("<svg ", '<svg class="ternary-svg" ');
}
