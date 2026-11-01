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
  [/var\(--color-action, #005a99\)/g, "#0072B2"],
  [/#005a99/g, "#0072B2"],
  [/var\(--color-alert, #9a3412\)/g, "#D55E00"],
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
  return out;
}
