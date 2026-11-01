// Utilidades de desenho SVG (U09/U16). Os números dos gráficos vêm do motor; aqui só há geometria.
// O mesmo SVG serve à tela (cores por variáveis CSS dos temas) e à exportação (cores literais).

export type Paint = "ink" | "inkSecondary" | "rule" | "action" | "panel" | "alert";
export type PaintMode = "css" | "static";

const STATIC: Record<Paint, string> = {
  ink: "#16191f",
  inkSecondary: "#454c58",
  rule: "#dde0e6",
  action: "#005a99",
  panel: "#ffffff",
  alert: "#9a3412",
};
const CSS_VARIABLE: Record<Paint, string> = {
  ink: "--color-ink",
  inkSecondary: "--color-ink-secondary",
  rule: "--color-rule",
  action: "--color-action",
  panel: "--color-panel",
  alert: "--color-alert",
};

/** Cor do papel semântico: variável CSS com a cor literal como reserva (tela) ou só a literal (exportação). */
export function paint(role: Paint, mode: PaintMode): string {
  return mode === "css" ? `var(${CSS_VARIABLE[role]}, ${STATIC[role]})` : STATIC[role];
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto e valores de atributo: rótulos vêm do usuário e entram no SVG. */
export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** Atributos numéricos com 2 casas: SVG determinístico e compacto. */
export function n(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Marcas "agradáveis" (1, 2, 5 × 10ᵏ) que cobrem `[min, max]`. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!(max > min)) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    return niceTicks(min - pad, max + pad, target);
  }
  const rough = (max - min) / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 5 : residual >= 2 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v / step) * step);
  return ticks;
}

export interface Frame {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const DEFAULT_FRAME: Frame = {
  width: 640,
  height: 380,
  left: 64,
  right: 16,
  top: 44,
  bottom: 70,
};

export function linear(domain: [number, number], range: [number, number]): (v: number) => number {
  const span = domain[1] - domain[0] || 1;
  return (v) => range[0] + ((v - domain[0]) / span) * (range[1] - range[0]);
}

/** Abre o SVG com título e descrição acessíveis e metadados opcionais (exportação). */
export function open(
  id: string,
  frame: Frame,
  title: string,
  description: string,
  mode: PaintMode,
  metadata?: string,
): string {
  const background =
    mode === "static"
      ? `<rect width="${frame.width}" height="${frame.height}" fill="${paint("panel", mode)}"/>`
      : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${frame.width} ${frame.height}" ` +
    `width="${mode === "static" ? frame.width : "100%"}" role="img" aria-labelledby="${id}-t ${id}-d" ` +
    `font-family="${mode === "css" ? "inherit" : "sans-serif"}" font-size="12">` +
    `<title id="${id}-t">${esc(title)}</title><desc id="${id}-d">${esc(description)}</desc>` +
    (metadata === undefined ? "" : `<metadata>${esc(metadata)}</metadata>`) +
    background
  );
}

export function text(
  x: number,
  y: number,
  content: string,
  mode: PaintMode,
  options: {
    anchor?: "start" | "middle" | "end";
    size?: number;
    role?: Paint;
    weight?: number;
    rotate?: number;
    /** Contorno na cor do painel, para ler o texto sobre desenhos (superfície 3D). */
    halo?: boolean;
  } = {},
): string {
  const { anchor = "middle", size = 12, role = "ink", weight = 400, rotate, halo } = options;
  const transform = rotate === undefined ? "" : ` transform="rotate(${rotate} ${n(x)} ${n(y)})"`;
  return (
    `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-size="${size}" ` +
    `font-weight="${weight}" fill="${paint(role, mode)}"${transform}` +
    (halo
      ? ` stroke="${paint("panel", mode)}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"`
      : "") +
    `>${esc(content)}</text>`
  );
}

export function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  mode: PaintMode,
  options: { role?: Paint; width?: number; dash?: string } = {},
): string {
  const { role = "rule", width = 1, dash } = options;
  return (
    `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${paint(role, mode)}" ` +
    `stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`
  );
}

/** Eixo vertical com grade horizontal e título; devolve também a escala. */
export function yAxis(
  frame: Frame,
  domain: [number, number],
  label: string,
  mode: PaintMode,
  format: (v: number) => string,
): { svg: string; scale: (v: number) => number } {
  const ticks = niceTicks(domain[0], domain[1]);
  const lo = Math.min(domain[0], ticks[0] ?? domain[0]);
  const hi = Math.max(domain[1], ticks[ticks.length - 1] ?? domain[1]);
  const scale = linear([lo, hi], [frame.height - frame.bottom, frame.top]);
  const parts: string[] = [];
  for (const tick of ticks) {
    const y = scale(tick);
    parts.push(line(frame.left, y, frame.width - frame.right, y, mode));
    parts.push(
      text(frame.left - 8, y + 4, format(tick), mode, { anchor: "end", role: "inkSecondary" }),
    );
  }
  parts.push(
    text(16, (frame.top + frame.height - frame.bottom) / 2, label, mode, {
      rotate: -90,
      role: "inkSecondary",
    }),
  );
  return { svg: parts.join(""), scale };
}

/** Quebra o texto em linhas de até `maxChars` caracteres (sem cortar palavras). */
export function wrapText(content: string, maxChars = 84): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of content.split(/\s+/).filter((w) => w !== "")) {
    if (current !== "" && current.length + 1 + word.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current === "" ? word : `${current} ${word}`;
    }
  }
  if (current !== "") lines.push(current);
  return lines;
}

/** Legenda no pé do gráfico, em linhas que terminam a 8 px da borda inferior. */
export function legend(frame: Frame, contents: string[], mode: PaintMode): string {
  const lines = contents.flatMap((c) => wrapText(c));
  return lines
    .map((line, i) =>
      text(frame.left, frame.height - 8 - 15 * (lines.length - 1 - i), line, mode, {
        anchor: "start",
        role: "inkSecondary",
      }),
    )
    .join("");
}

export function close(): string {
  return "</svg>";
}
