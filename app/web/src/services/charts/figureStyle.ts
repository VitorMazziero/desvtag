// Personalização por figura (título, rótulos dos eixos, letras e fonte), aplicada ao SVG já montado.
// Os textos do desenho trazem `data-figure="papel"` (svg.ts); aqui só se troca ou remove o texto
// apresentado. Dados, escalas e resultados não mudam, e tela e exportação usam a mesma função.
import type { FigureStyle } from "../engine";
import { esc } from "./svg";

export type FigureField = "title" | "xLabel" | "yLabel" | "letters";

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

function clean(value: string | undefined): string | null {
  const text = value?.replace(/[\r\n]+/g, " ").trim();
  return text === undefined || text === "" ? null : text.slice(0, MAX_FIGURE_TEXT);
}

/** Aplica título, rótulos e letras ao SVG. `style` vazio devolve o SVG sem alterações. */
export function applyFigureStyle(svg: string, style: FigureStyle | undefined): string {
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
  if (style.showLetters === false) {
    out = out.replace(TEXT_ELEMENT("letters"), "").replace(TEXT_ELEMENT("lettersLegend"), "");
  }
  return out;
}
