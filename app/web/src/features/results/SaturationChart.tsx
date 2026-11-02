// Curva de saturação ajustada: pontos observados, curva e faixa de confiança (método delta).
// Cores acessíveis a daltonismo (Okabe–Ito); a tabela de parâmetros e os resíduos dão o mesmo
// resultado em texto.
import type { CurvePoint } from "../../services/engine";

interface Props {
  points: Array<{ x: number; y: number }>;
  curve: CurvePoint[];
  xLabel: string;
  yLabel: string;
  label: string;
}

const W = 520;
const H = 320;
const M = { left: 56, right: 16, top: 16, bottom: 44 };

function nice(max: number): number {
  if (!(max > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const f = max / magnitude;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * magnitude;
}

export function SaturationChart({ points, curve, xLabel, yLabel, label }: Props) {
  if (curve.length === 0) return null;
  const upper = curve.map((c) => (c.upper.status === "defined" ? c.upper.value : c.y));
  const lower = curve.map((c) => (c.lower.status === "defined" ? c.lower.value : c.y));
  const xMax = nice(Math.max(...curve.map((c) => c.x), ...points.map((p) => p.x)));
  const yMax = nice(Math.max(...upper, ...points.map((p) => p.y)));
  const yMin = Math.min(0, ...lower, ...points.map((p) => p.y));
  const sx = (x: number) => M.left + (x / xMax) * (W - M.left - M.right);
  const sy = (y: number) =>
    H - M.bottom - ((y - yMin) / (yMax - yMin || 1)) * (H - M.top - M.bottom);
  const line = curve.map((c) => `${sx(c.x).toFixed(1)},${sy(c.y).toFixed(1)}`).join(" ");
  const band = [
    ...curve.map((c, i) => `${sx(c.x).toFixed(1)},${sy(upper[i] as number).toFixed(1)}`),
    ...[...curve]
      .reverse()
      .map(
        (c, i) => `${sx(c.x).toFixed(1)},${sy(lower[curve.length - 1 - i] as number).toFixed(1)}`,
      ),
  ].join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <figure className="saturation-chart" data-testid="saturation-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        style={{ maxWidth: 560, width: "100%", height: "auto" }}
      >
        <title>{label}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={sy(yMin + t * (yMax - yMin))}
              y2={sy(yMin + t * (yMax - yMin))}
              stroke="currentColor"
              strokeOpacity={0.12}
            />
            <text
              x={M.left - 6}
              y={sy(yMin + t * (yMax - yMin)) + 4}
              textAnchor="end"
              fontSize={11}
              fill="currentColor"
            >
              {Number((yMin + t * (yMax - yMin)).toPrecision(3))}
            </text>
            <text
              x={sx(t * xMax)}
              y={H - M.bottom + 16}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
            >
              {Number((t * xMax).toPrecision(3))}
            </text>
          </g>
        ))}
        <polygon points={band} fill="#0072B2" fillOpacity={0.15} />
        <polyline points={line} fill="none" stroke="#0072B2" strokeWidth={2} />
        {points.map((p, i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: pontos observados, sem identidade própria.
            key={i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={3.5}
            fill="#D55E00"
            stroke="#fff"
            strokeWidth={0.8}
          />
        ))}
        <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} stroke="currentColor" />
        <line
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          stroke="currentColor"
        />
        <text
          x={(M.left + W - M.right) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={12}
          fill="currentColor"
        >
          {xLabel}
        </text>
        <text
          x={14}
          y={(M.top + H - M.bottom) / 2}
          textAnchor="middle"
          fontSize={12}
          fill="currentColor"
          transform={`rotate(-90 14 ${(M.top + H - M.bottom) / 2})`}
        >
          {yLabel}
        </text>
      </svg>
    </figure>
  );
}
