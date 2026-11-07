import { layoutFigure } from "./layout";
// Personalização essencial das figuras (tamanho da fonte e paleta segura para daltonismo), aplicada
// ao SVG já montado: tela e exportação recebem exatamente o mesmo tratamento. Nada aqui altera dados.

export type ChartPalette = "default" | "colorblind";

export interface ChartStyle {
  palette: ChartPalette;
  /** Multiplica todos os tamanhos de fonte (0,85, 1 ou 1,2). */
  fontScale: number;
}

/** Cores de Okabe e Ito: azul (#0072B2) e vermelhão (#D55E00) são distinguíveis nas formas comuns de daltonismo. */
const REPLACEMENTS: Array<[RegExp, string]> = [
  [/var\(--(?:color-action|chart-series), #005a99\)/g, "#0072B2"],
  [/#005a99/g, "#0072B2"],
  [/var\(--(?:color-alert|chart-reference), #9a3412\)/g, "#D55E00"],
  [/#9a3412/g, "#D55E00"],
];

export function applyChartStyle(svg: string, style: ChartStyle): string {
  let out = svg;
  if (style.fontScale !== 1) {
    out = out.replace(/font-size="(\d+(?:\.\d+)?)"/g, (_m, size: string) => {
      const scaled = Math.round(Number(size) * style.fontScale * 10) / 10;
      return `font-size="${scaled}"`;
    });
  }
  if (style.palette === "colorblind") {
    for (const [pattern, color] of REPLACEMENTS) out = out.replace(pattern, color);
  }
  // Static exports resolve opaque shades after custom colours/palette are applied.
  // Opaque cells avoid anti-aliasing seams that otherwise look like an unwanted fine mesh.
  out = out.replace(
    /color-mix\(in srgb, (#[0-9a-f]{6}) ([\d.]+)%, (#[0-9a-f]{6})\)/gi,
    (_m, a: string, percent: string, b: string) => {
      const t = Number(percent) / 100;
      const rgb = [1, 3, 5].map((i) =>
        Math.round(
          Number.parseInt(a.slice(i, i + 2), 16) * t +
            Number.parseInt(b.slice(i, i + 2), 16) * (1 - t),
        ),
      );
      return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    },
  );
  return layoutFigure(out);
}
