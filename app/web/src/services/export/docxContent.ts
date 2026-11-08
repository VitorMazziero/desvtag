// Converte o DOM limpo do relatório em conteúdo do Word (docx): títulos, parágrafos, listas,
// tabelas, interpretação e figuras. As figuras SVG viram PNG (o Word não abre SVG de forma
// confiável); a rasterização é injetada, então a conversão testa-se sem navegador gráfico.
import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ImageRun,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { svgPixelBox } from "./svgSize";
import { tableBands } from "./tableBands";

export type DocxBlock = Paragraph | Table;

/** Figura rasterizada: bytes PNG e o tamanho natural em pixels. */
export interface Raster {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export type Rasterizer = (svg: string, width: number, height: number) => Promise<Raster>;

/** Largura útil da página A4 com margens de 2 cm (em pixels de 96 dpi). */
export const CONTENT_PX = 643;
/** Referências de numeração do documento (ver `reportDocx`). */
export const NUMBERING_ORDERED = "optima-ordered";

const BLOCK = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DETAILS",
  "DIV",
  "DL",
  "FIELDSET",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "SECTION",
  "SVG",
  "TABLE",
  "UL",
]);

/** Tamanho em meios pontos e nível semântico (navegação do Word) de cada título. */
const HEADING: Record<
  string,
  { size: number; level: (typeof HeadingLevel)[keyof typeof HeadingLevel] }
> = {
  H1: { size: 32, level: HeadingLevel.HEADING_1 },
  H2: { size: 27, level: HeadingLevel.HEADING_2 },
  H3: { size: 23, level: HeadingLevel.HEADING_3 },
  H4: { size: 21, level: HeadingLevel.HEADING_4 },
  H5: { size: 20, level: HeadingLevel.HEADING_5 },
  H6: { size: 20, level: HeadingLevel.HEADING_6 },
};

const BODY_SIZE = 20;
const LINE = "C9CDD4";

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  size?: number;
}

/** Contexto da conversão: rasterizador e contador de listas numeradas (cada uma reinicia em 1). */
export interface DocxContext {
  rasterize: Rasterizer;
  orderedLists: number;
}

const skipped = (el: Element): boolean =>
  el.classList.contains("sr-only") ||
  el.hasAttribute("hidden") ||
  ["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName.toUpperCase());

interface Part extends RunStyle {
  text?: string;
  lineBreak?: boolean;
}

function parts(node: Node, style: RunStyle, out: Part[]): void {
  if (node.nodeType === 3) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ");
    if (text !== "") out.push({ ...style, text });
    return;
  }
  if (!(node instanceof Element) || skipped(node)) return;
  const tag = node.tagName.toUpperCase();
  if (tag === "BR") {
    out.push({ lineBreak: true });
    return;
  }
  const next: RunStyle = {
    ...style,
    bold: style.bold || tag === "STRONG" || tag === "B" || tag === "TH",
    italics: style.italics || tag === "EM" || tag === "I",
  };
  for (const child of node.childNodes) parts(child, next, out);
}

/** Texto aparado das pontas: o DOM tem espaços de indentação que o Word mostraria. */
function trimmedText(el: Node): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

const hasText = (el: Node): boolean => trimmedText(el) !== "";

function toRuns(found: Part[]): TextRun[] {
  const first = found.find((p) => p.text !== undefined);
  if (first?.text !== undefined) first.text = first.text.replace(/^\s+/, "");
  const last = [...found].reverse().find((p) => p.text !== undefined);
  if (last?.text !== undefined) last.text = last.text.replace(/\s+$/, "");
  return found
    .filter((p) => p.lineBreak || (p.text ?? "") !== "")
    .map((p) =>
      p.lineBreak
        ? new TextRun({ break: 1 })
        : new TextRun({
            text: p.text ?? "",
            bold: p.bold,
            italics: p.italics,
            size: p.size ?? BODY_SIZE,
          }),
    );
}

function inline(el: Node, base: RunStyle = {}): TextRun[] {
  const found: Part[] = [];
  parts(el, base, found);
  return toRuns(found);
}

function paragraph(el: Node): Paragraph {
  return new Paragraph({ children: inline(el), spacing: { after: 100 } });
}

async function figure(svg: Element, ctx: DocxContext): Promise<DocxBlock[]> {
  const { width, height } = svgPixelBox(svg);
  const source = new XMLSerializer().serializeToString(svg);
  const raster = await ctx.rasterize(source, width, height);
  const scale = Math.min(1, CONTENT_PX / width);
  const alt = svg.getAttribute("aria-label") ?? trimmedText(svg.querySelector("title") ?? svg);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: false,
      spacing: { before: 80, after: 120 },
      children: [
        new ImageRun({
          type: "png",
          data: raster.bytes,
          transformation: {
            width: Math.round(width * scale),
            height: Math.round(height * scale),
          },
          altText: { name: "figura", title: alt.slice(0, 120), description: alt.slice(0, 500) },
        }),
      ],
    }),
  ];
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE } as const;

function table(el: HTMLTableElement): DocxBlock[] {
  const rows = [...el.querySelectorAll("tr")].filter((tr) => tr.closest("table") === el);
  if (rows.length === 0) return [];
  const headerRows = rows.filter(
    (tr) => tr.parentElement?.tagName.toUpperCase() === "THEAD",
  ).length;
  const size = 18;
  const built = rows.map((tr, rowIndex) => {
    const header = rowIndex < headerRows;
    const cells: TableCell[] = [];
    for (const cell of tr.children) {
      const tag = cell.tagName.toUpperCase();
      if (tag !== "TH" && tag !== "TD") continue;
      const span = Math.max(1, Number(cell.getAttribute("colspan") ?? "1") || 1);
      cells.push(
        new TableCell({
          columnSpan: span > 1 ? span : undefined,
          shading: header ? { type: ShadingType.CLEAR, fill: "F3F4F7", color: "auto" } : undefined,
          borders: {
            top: cellBorder,
            bottom: cellBorder,
            left: cellBorder,
            right: cellBorder,
          },
          margins: { top: 30, bottom: 30, left: 60, right: 60 },
          children: [
            new Paragraph({
              alignment: cell.classList.contains("num") ? AlignmentType.RIGHT : AlignmentType.LEFT,
              keepNext: header,
              children: inline(cell, { bold: header, size }),
            }),
          ],
        }),
      );
    }
    return new TableRow({ children: cells, tableHeader: header, cantSplit: true });
  });
  const out: DocxBlock[] = [];
  const caption = el.querySelector("caption");
  if (caption && hasText(caption))
    out.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 160, after: 40 },
        children: [new TextRun({ text: trimmedText(caption), bold: true, size: 19 })],
      }),
    );
  out.push(
    new Table({ rows: built, width: { size: 100, type: WidthType.PERCENTAGE } }),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  );
  return out;
}

async function list(el: Element, ctx: DocxContext): Promise<DocxBlock[]> {
  const ordered = el.tagName.toUpperCase() === "OL";
  const instance = ordered ? ++ctx.orderedLists : 0;
  const marker = ordered
    ? { numbering: { reference: NUMBERING_ORDERED, level: 0, instance } }
    : { bullet: { level: 0 } };
  const out: DocxBlock[] = [];
  for (const li of el.children) {
    if (li.tagName.toUpperCase() !== "LI" || skipped(li)) continue;
    // Texto do item (e parágrafos dentro dele) leva o marcador; listas e tabelas aninhadas vêm depois.
    let found: Part[] = [];
    const flush = () => {
      const runsOfItem = toRuns(found);
      if (runsOfItem.length > 0)
        out.push(new Paragraph({ ...marker, children: runsOfItem, spacing: { after: 40 } }));
      found = [];
    };
    for (const child of li.childNodes) {
      if (child instanceof Element && skipped(child)) continue;
      if (child instanceof Element && BLOCK.has(child.tagName.toUpperCase())) {
        if (child.tagName.toUpperCase() === "P") {
          parts(child, {}, found);
          continue;
        }
        flush();
        out.push(...(await blockNode(child, ctx)));
      } else {
        parts(child, {}, found);
      }
    }
    flush();
  }
  return out;
}

function definitionList(dl: Element): DocxBlock[] {
  const out: DocxBlock[] = [];
  for (const child of dl.children) {
    if (skipped(child) || !hasText(child)) continue;
    const term = child.tagName.toUpperCase() === "DT";
    out.push(
      new Paragraph({
        keepNext: term,
        indent: term ? undefined : { left: 284 },
        spacing: { before: term ? 100 : 0, after: term ? 20 : 40 },
        children: inline(child, { bold: term }),
      }),
    );
  }
  return out;
}

async function blockNode(el: Element, ctx: DocxContext): Promise<DocxBlock[]> {
  const tag = el.tagName.toUpperCase();
  const heading = HEADING[tag];
  if (heading) {
    if (!hasText(el)) return [];
    return [
      new Paragraph({
        heading: heading.level,
        keepNext: true,
        spacing: { before: 200, after: 80 },
        children: inline(el, { bold: true, size: heading.size }),
      }),
    ];
  }
  switch (tag) {
    case "P":
      return hasText(el) ? [paragraph(el)] : [];
    case "UL":
    case "OL":
      return list(el, ctx);
    case "DL":
      return definitionList(el);
    case "TABLE":
      return tableBands(el as HTMLTableElement).flatMap(table);
    case "SVG":
      return figure(el, ctx);
    case "HR":
      return [];
    default:
      return blocks(el, ctx);
  }
}

/** Blocos de um elemento: texto solto vira parágrafo; elementos de bloco são convertidos. */
export async function blocks(root: Element, ctx: DocxContext): Promise<DocxBlock[]> {
  const out: DocxBlock[] = [];
  let buffer: Part[] = [];
  const flush = () => {
    const children = toRuns(buffer);
    if (children.length > 0) out.push(new Paragraph({ children, spacing: { after: 100 } }));
    buffer = [];
  };
  for (const child of root.childNodes) {
    if (child instanceof Element && skipped(child)) continue;
    if (child instanceof Element && BLOCK.has(child.tagName.toUpperCase())) {
      flush();
      out.push(...(await blockNode(child, ctx)));
    } else {
      parts(child, {}, buffer);
    }
  }
  flush();
  return out;
}
