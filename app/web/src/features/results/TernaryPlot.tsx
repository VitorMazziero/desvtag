// Gráfico ternário (três componentes): previsão do modelo de Scheffé sobre o triângulo dos
// pseudocomponentes, com os pontos do planejamento. O componente 1 fica no vértice superior, o 2 no
// inferior esquerdo e o 3 no inferior direito. A escala é sequencial e acessível a daltonismo
// (viridis); os valores mínimo e máximo aparecem na legenda e a tabela de coeficientes dá o mesmo
// resultado em texto.
import type { MixtureGridPoint } from "../../services/engine";

const STOPS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const H = Math.sqrt(3) / 2;
const W = 360;
const PAD = 44;

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

interface Props {
  names: string[];
  grid: MixtureGridPoint[];
  /** Pseudocomponentes dos ensaios, para sobrepor os pontos. */
  points: number[][];
  label: string;
  minLabel: string;
  maxLabel: string;
}

export function TernaryPlot({ names, grid, points, label, minLabel, maxLabel }: Props) {
  const size = W - 2 * PAD;
  const toXY = (p: number[]): [number, number] => {
    const [p1 = 0, p2 = 0, p3 = 0] = p;
    return [PAD + (p1 * 0.5 + p3 * 1) * size, PAD + (p2 * H + p3 * H) * size];
  };
  if (grid.length === 0) return null;
  const m = Math.round(Math.sqrt(grid.length * 2)) - 1;
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
        corners.reduce((s, [x, y]) => s + (values.get(`${x},${y}`) ?? lo), 0) / corners.length;
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
  return (
    <figure className="ternary" data-testid="ternary-plot">
      <svg
        viewBox={`0 0 ${W} ${size * H + 2 * PAD}`}
        role="img"
        aria-label={label}
        className="ternary-svg"
        style={{ maxWidth: 420, width: "100%", height: "auto" }}
      >
        <title>{label}</title>
        {cells.map((c) => (
          <polygon key={c.key} points={c.points} fill={c.fill} stroke={c.fill} strokeWidth={0.4} />
        ))}
        <polygon
          points={`${v1x},${v1y} ${v2x},${v2y} ${v3x},${v3y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        />
        {points.map((p, i) => {
          const [x, y] = toXY(p);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: pontos do planejamento, sem identidade própria.
            <circle key={i} cx={x} cy={y} r={3} fill="#fff" stroke="#000" strokeWidth={1} />
          );
        })}
        <text x={v1x} y={v1y - 10} textAnchor="middle" fontSize={13} fill="currentColor">
          {names[0]}
        </text>
        <text x={v2x} y={v2y + 20} textAnchor="middle" fontSize={13} fill="currentColor">
          {names[1]}
        </text>
        <text x={v3x} y={v3y + 20} textAnchor="middle" fontSize={13} fill="currentColor">
          {names[2]}
        </text>
      </svg>
      <figcaption className="muted small">
        <span
          aria-hidden="true"
          className="ternary-scale"
          style={{
            display: "inline-block",
            width: 120,
            height: 10,
            verticalAlign: "middle",
            background: `linear-gradient(90deg, ${STOPS.join(",")})`,
          }}
        />{" "}
        {minLabel}: {lo.toPrecision(4)} · {maxLabel}: {hi.toPrecision(4)}
      </figcaption>
    </figure>
  );
}
