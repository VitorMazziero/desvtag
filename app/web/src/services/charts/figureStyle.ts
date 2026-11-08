// Personalização por figura (textos, letras manuais, anotações livres e aparência), aplicada ao SVG
// já montado. Os elementos do desenho trazem `data-figure="papel"` (svg.ts); aqui só se troca,
// oculta ou acrescenta o que é apresentado. Dados, escalas e resultados não mudam, e tela e
// exportação usam a mesma função.
import type { FigureAnnotation, FigureStyle } from "../engine";
import { esc } from "./svg";

export type FigureField = "title" | "xLabel" | "yLabel" | "letters" | "grid" | "legend";

/** Máximo de caracteres por texto personalizado (igual ao do projeto, no Rust). */
export const MAX_FIGURE_TEXT = 200;

const TEXT_ELEMENT = (role: string) =>
  new RegExp(`(<text\\b[^>]*\\sdata-figure="${role}"[^>]*>)([^<]*)(</text>)`, "g");

/** Campos que esta figura permite personalizar, conforme os textos marcados no desenho. */
export function figureFields(svg: string): FigureField[] {
  const fields: FigureField[] = [];
  if (svg.includes('data-figure="title"')) fields.push("title");
  if (svg.includes('data-figure="xLabel"')) fields.push("xLabel");
  if (svg.includes('data-figure="yLabel"')) fields.push("yLabel");
  if (svg.includes('data-figure="letters"')) fields.push("letters");
  if (svg.includes('data-figure="grid"')) fields.push("grid");
  if (svg.includes('data-figure="legend"') || svg.includes('data-figure="lettersLegend"'))
    fields.push("legend");
  return fields;
}

/** Texto padrão (já sem escape de entidades) de um papel, para exibir como sugestão. */
export function defaultFigureText(svg: string, role: "title" | "xLabel" | "yLabel"): string {
  const match = new RegExp(`<text\\b[^>]*\\sdata-figure="${role}"[^>]*>([^<]*)</text>`).exec(svg);
  return (match?.[1] ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Quantos grupos têm espaço para letra na figura (o que as letras manuais podem preencher). */
export function letterSlots(svg: string): number {
  return (svg.match(/data-figure="letters"/g) ?? []).length;
}

/** Letras calculadas, na ordem do desenho, para sugerir ao digitar as manuais. */
export function computedLetters(svg: string): string[] {
  return [...svg.matchAll(TEXT_ELEMENT("letters"))].map((m) => m[2] ?? "");
}

export const FONT_FAMILIES: Record<string, string> = {
  sans: "sans-serif",
  serif: "DejaVu Serif, Georgia, serif",
  mono: "DejaVu Sans Mono, Consolas, monospace",
};

export interface ApplyOptions {
  /** Texto da legenda quando as letras são digitadas à mão (já traduzido). */
  manualLettersLegend?: string;
}

const LEGEND_STEP = 15;

function clean(value: string | undefined): string | null {
  const text = value?.replace(/[\r\n]+/g, " ").trim();
  return text === undefined || text === "" ? null : text.slice(0, MAX_FIGURE_TEXT);
}

/** Aplica a personalização ao SVG. `style` vazio devolve o SVG sem alterações. */
export function applyFigureStyle(
  svg: string,
  style: FigureStyle | undefined,
  options: ApplyOptions = {},
): string {
  if (!style) return svg;
  let out = svg;
  const replaceText = (role: "title" | "xLabel" | "yLabel", value: string | undefined) => {
    const text = clean(value);
    if (text === null) return;
    out = out.replace(TEXT_ELEMENT(role), (_m, open: string, _old: string, end: string) => {
      return `${open}${esc(text)}${end}`;
    });
    if (role === "title") {
      // O título acessível do SVG acompanha o título visível.
      out = out.replace(
        /(<title id="[^"]*">)([^<]*)(<\/title>)/,
        (_m, a: string, _b: string, c: string) => {
          return `${a}${esc(text)}${c}`;
        },
      );
    }
  };
  replaceText("title", style.title);
  replaceText("xLabel", style.xLabel);
  replaceText("yLabel", style.yLabel);
  const manual = style.manualLetters?.some((l) => l.trim() !== "")
    ? style.manualLetters
    : undefined;
  if (manual) out = applyManualLetters(out, manual, options.manualLettersLegend);
  if (style.showLetters === false) {
    out = out.replace(TEXT_ELEMENT("letters"), "").replace(TEXT_ELEMENT("lettersLegend"), "");
  }
  if (style.showLegend === false) {
    out = out.replace(TEXT_ELEMENT("legend"), "").replace(TEXT_ELEMENT("lettersLegend"), "");
  }
  if (style.showGrid === false) {
    out = out.replace(/<line\b[^>]*\sdata-figure="grid"[^>]*\/>/g, "");
  }
  if (style.primaryColor) {
    out = out
      .replace(/var\(--(?:color-action|chart-series), #005a99\)/g, style.primaryColor)
      .replace(/#005a99/g, style.primaryColor);
  }
  if (style.background === "transparent") {
    out = out.replace(/<rect\b[^>]*\sdata-figure="background"[^>]*\/>/, "");
  }
  const family = style.fontFamily ? FONT_FAMILIES[style.fontFamily] : undefined;
  if (family) out = out.replace(/font-family="[^"]*"/, `font-family="${family}"`);
  if (style.annotations?.length) out = addAnnotations(out, style.annotations);
  return out;
}

/** Troca as letras calculadas pelas digitadas (por posição) e identifica-as como manuais. */
function applyManualLetters(
  svg: string,
  letters: string[],
  legendText: string | undefined,
): string {
  let index = 0;
  let out = svg.replace(TEXT_ELEMENT("letters"), (_m, open: string, _old: string, end: string) => {
    const letter = (letters[index] ?? "").trim();
    index += 1;
    return `${open}${esc(letter)}${end}`;
  });
  if (!legendText) return out;
  if (TEXT_ELEMENT("lettersLegend").test(out)) {
    out = out.replace(
      TEXT_ELEMENT("lettersLegend"),
      (_m, open: string, _old: string, end: string) => `${open}${esc(legendText)}${end}`,
    );
    // Só a primeira linha da legenda das letras vira o aviso; as demais linhas somem.
    let seen = 0;
    return out.replace(TEXT_ELEMENT("lettersLegend"), (m) => (seen++ === 0 ? m : ""));
  }
  return addLegendLine(out, legendText);
}

/** Acrescenta uma linha de legenda acima das existentes, alinhada à esquerda do desenho. */
function addLegendLine(svg: string, content: string): string {
  const height = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)?.[1] ?? 380);
  const lines = [
    ...svg.matchAll(
      /<text\b[^>]*\sx="([\d.-]+)"\sy="([\d.-]+)"[^>]*data-figure="(?:legend|lettersLegend)"/g,
    ),
  ];
  const top = lines.length ? Math.min(...lines.map((m) => Number(m[2]))) : height - 8 + LEGEND_STEP;
  const x = lines.length ? Number(lines[0]?.[1]) : 64;
  const ink = svg.includes("var(--color-ink-secondary")
    ? "var(--color-ink-secondary, #454c58)"
    : "#454c58";
  const line =
    `<text x="${x}" y="${top - LEGEND_STEP}" text-anchor="start" font-size="12" font-weight="400" ` +
    `fill="${ink}" data-figure="lettersLegend">${esc(content)}</text>`;
  return svg.replace("</svg>", `${line}</svg>`);
}

/** Textos livres em posição relativa (0 = esquerda/topo, 1 = direita/base) do desenho. */
function addAnnotations(svg: string, annotations: FigureAnnotation[]): string {
  const match = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const width = Number(match?.[1] ?? 640);
  const height = Number(match?.[2] ?? 380);
  const css = svg.includes("var(--color-ink");
  const ink = css ? "var(--color-ink, #16191f)" : "#16191f";
  const halo = css ? "var(--color-panel, #ffffff)" : "#ffffff";
  const nodes = annotations
    .map((a) => ({ ...a, text: clean(a.text) }))
    .filter((a): a is FigureAnnotation => a.text !== null && a.text !== "")
    .map(
      (a) =>
        `<text x="${Math.round(a.x * width * 100) / 100}" y="${Math.round(a.y * height * 100) / 100}" ` +
        `text-anchor="middle" font-size="12" font-weight="400" fill="${ink}" stroke="${halo}" ` +
        `stroke-width="3" paint-order="stroke" stroke-linejoin="round" data-figure="annotation">` +
        `${esc(a.text)}</text>`,
    );
  return nodes.length ? svg.replace("</svg>", `${nodes.join("")}</svg>`) : svg;
}
