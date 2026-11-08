import { flattenHatching } from "./hatching";
import { tableBands } from "./tableBands";
// Converte o DOM limpo do relatório em conteúdo do pdfmake: títulos, parágrafos, listas, tabelas,
// interpretação e figuras (SVG vetorial). Só leitura do DOM e montagem de objetos; sem biblioteca
// de PDF aqui, para testar a conversão sem gerar arquivo.

export type PdfNode = Record<string, unknown>;

/** Largura útil da página A4 (pt) com margens de 40 pt. */
export const CONTENT_WIDTH = 515;
const FONT = "Roboto";

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

const HEADING: Record<string, { fontSize: number; margin: [number, number, number, number] }> = {
  H1: { fontSize: 16, margin: [0, 10, 0, 4] },
  H2: { fontSize: 13.5, margin: [0, 14, 0, 4] },
  H3: { fontSize: 11.5, margin: [0, 10, 0, 3] },
  H4: { fontSize: 10.5, margin: [0, 8, 0, 3] },
  H5: { fontSize: 10, margin: [0, 6, 0, 2] },
  H6: { fontSize: 10, margin: [0, 6, 0, 2] },
};

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
}

const skipped = (el: Element): boolean =>
  el.classList.contains("sr-only") ||
  el.hasAttribute("hidden") ||
  ["SCRIPT", "STYLE", "TEMPLATE"].includes(el.tagName.toUpperCase());

/** Símbolos que a fonte embutida não tem, trocados por equivalentes que ela tem. */
const GLYPHS: Array<[RegExp, string]> = [[/→/g, "–"]];

const supported = (text: string): string =>
  GLYPHS.reduce((t, [from, to]) => t.replace(from, to), text);

/** Preserve selected embedded fonts and expand hatching into vector lines. */
export function pdfSvg(svg: string): string {
  const family = /font-family="([^"]*)"/.exec(svg)?.[1] ?? "";
  const selectedFont = family.includes("DejaVu Serif")
    ? "DejaVu Serif"
    : family.includes("DejaVu Sans Mono")
      ? "DejaVu Sans Mono"
      : FONT;
  let out = supported(flattenHatching(svg))
    .replace(/font-family="[^"]*"/g, `font-family="${selectedFont}"`)
    .replace(/<text\b(?![^>]*font-family=)/g, `<text font-family="${selectedFont}"`);

  out = out.replace(
    /<text\b([^>]*?)\spaint-order="stroke"([^>]*)>([^<]*)<\/text>/g,
    (_m, before: string, after: string, content: string) => {
      const attrs = `${before}${after}`;
      const plain = attrs
        .replace(/\sstroke="[^"]*"/, "")
        .replace(/\sstroke-width="[^"]*"/, "")
        .replace(/\sstroke-linejoin="[^"]*"/, "");
      return `<text${attrs}>${content}</text><text${plain}>${content}</text>`;
    },
  );
  return out;
}

function runs(node: Node, style: RunStyle, out: PdfNode[]): void {
  if (node.nodeType === 3) {
    const text = supported((node.textContent ?? "").replace(/\s+/g, " "));
    if (text !== "") out.push({ text, ...style });
    return;
  }
  if (!(node instanceof Element) || skipped(node)) return;
  const tag = node.tagName.toUpperCase();
  if (tag === "BR") {
    out.push({ text: "\n" });
    return;
  }
  const next: RunStyle = {
    bold: style.bold || tag === "STRONG" || tag === "B" || tag === "TH",
    italics: style.italics || tag === "EM" || tag === "I",
  };
  for (const child of node.childNodes) runs(child, next, out);
}

/** Texto em linha de um elemento, sem espaços sobrando nas pontas. */
function inline(el: Node, base: RunStyle = {}): PdfNode[] {
  const out: PdfNode[] = [];
  runs(el, base, out);
  const first = out[0];
  const last = out[out.length - 1];
  if (first && typeof first.text === "string") first.text = first.text.replace(/^\s+/, "");
  if (last && typeof last.text === "string") last.text = last.text.replace(/\s+$/, "");
  return out.filter((r) => r.text !== "");
}

const hasText = (parts: PdfNode[]): boolean =>
  parts.some((p) => typeof p.text === "string" && p.text.trim() !== "");

function svgNode(svg: Element): PdfNode {
  const box = /^[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)$/.exec(
    (svg.getAttribute("viewBox") ?? "").trim().replace(/\s+/g, " "),
  );
  const natural = Number(box?.[1] ?? CONTENT_WIDTH);
  return {
    svg: pdfSvg(new XMLSerializer().serializeToString(svg)),
    width: Math.min(CONTENT_WIDTH, natural),
    margin: [0, 4, 0, 4],
  };
}

function tableNode(table: HTMLTableElement): PdfNode[] {
  const rows = [...table.querySelectorAll("tr")].filter((tr) => tr.closest("table") === table);
  if (rows.length === 0) return [];
  const headerRows = rows.filter(
    (tr) => tr.parentElement?.tagName.toUpperCase() === "THEAD",
  ).length;
  const body = rows.map((tr, rowIndex) => {
    const cells: PdfNode[] = [];
    for (const cell of tr.children) {
      const tag = cell.tagName.toUpperCase();
      if (tag !== "TH" && tag !== "TD") continue;
      const header = rowIndex < headerRows;
      const parts = inline(cell, { bold: header });
      const span = Math.max(1, Number(cell.getAttribute("colspan") ?? "1") || 1);
      cells.push({
        text: hasText(parts) ? parts : "",
        alignment: cell.classList.contains("num") ? "right" : "left",
        ...(header ? { fillColor: "#f3f4f7" } : {}),
        ...(span > 1 ? { colSpan: span } : {}),
      });
      for (let i = 1; i < span; i++) cells.push({});
    }
    return cells;
  });
  const columns = Math.max(...body.map((r) => r.length));
  for (const row of body) while (row.length < columns) row.push({ text: "" });
  const available = CONTENT_WIDTH - columns * 7 - 1;
  const descriptive =
    columns >= 4 &&
    rows.slice(headerRows).some((row) => {
      const first = row.querySelector("th,td");
      return (
        first && !first.classList.contains("num") && (first.textContent?.trim().length ?? 0) > 20
      );
    });
  const firstWidth =
    table.dataset.paperOrdinal === "true"
      ? 24
      : descriptive
        ? Math.max(available / columns, Math.min(available * 0.45, available - (columns - 1) * 72))
        : available / columns;
  const widths =
    columns === 1
      ? [available]
      : [firstWidth, ...Array(columns - 1).fill((available - firstWidth) / (columns - 1))];
  const node: PdfNode = {
    table: {
      headerRows,
      keepWithHeaderRows: headerRows > 0 ? Math.min(2, body.length - headerRows) : 0,
      dontBreakRows: true,
      widths,
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#c9cdd4",
      vLineColor: () => "#c9cdd4",
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    fontSize: 9,
    margin: [0, 2, 0, 8],
  };
  const caption = table.querySelector("caption");
  if (caption?.textContent?.trim())
    tableHeading(node, {
      text: caption.textContent.trim(),
      bold: true,
      fontSize: 9.5,
      margin: [0, 4, 0, 2],
    });
  return [node];
}

/** Table headers are moved/repeated atomically by pdfmake; external captions are not. */
function tableHeading(node: PdfNode, heading: PdfNode) {
  const table = node.table as {
    body: PdfNode[][];
    headerRows: number;
    widths: number[];
    keepWithHeaderRows: number;
  };
  const cell = {
    ...heading,
    headlineLevel: undefined,
    colSpan: table.widths.length,
    border: [false, false, false, false],
  };
  table.body.unshift([cell, ...Array.from({ length: table.widths.length - 1 }, () => ({}))]);
  table.headerRows++;
  table.keepWithHeaderRows = Math.min(2, table.body.length - table.headerRows);
}

function listNode(list: Element): PdfNode[] {
  const items: PdfNode[] = [];
  for (const li of list.children) {
    if (li.tagName.toUpperCase() !== "LI" || skipped(li)) continue;
    const nodes = blocks(li);
    const only = nodes.length === 1 ? nodes[0] : undefined;
    items.push(only && "text" in only ? only : { stack: nodes });
  }
  if (items.length === 0) return [];
  return [{ [list.tagName.toUpperCase() === "OL" ? "ol" : "ul"]: items, margin: [0, 2, 0, 6] }];
}

function definitionList(dl: Element): PdfNode[] {
  const out: PdfNode[] = [];
  for (const child of dl.children) {
    if (skipped(child)) continue;
    const term = child.tagName.toUpperCase() === "DT";
    const parts = inline(child, { bold: term });
    if (!hasText(parts)) continue;
    out.push({ text: parts, margin: term ? [0, 5, 0, 1] : [10, 0, 0, 2] });
  }
  return out;
}

function blockNode(el: Element): PdfNode[] {
  const tag = el.tagName.toUpperCase();
  if (el.hasAttribute("data-report-keep-together")) {
    const stack = blocks(el);
    return stack.length ? [{ stack, unbreakable: true }] : [];
  }
  const heading = HEADING[tag];
  if (heading) {
    const parts = inline(el, { bold: true });
    return hasText(parts) ? [{ text: parts, ...heading, headlineLevel: 1 }] : [];
  }
  switch (tag) {
    case "P": {
      const parts = inline(el);
      return hasText(parts) ? [{ text: parts, margin: [0, 0, 0, 5] }] : [];
    }
    case "UL":
    case "OL":
      return listNode(el);
    case "DL":
      return definitionList(el);
    case "TABLE":
      return tableBands(el as HTMLTableElement).flatMap(tableNode);
    case "SVG":
      return [svgNode(el)];
    case "HR":
      return [];
    case "FIGURE": {
      const nodes = blocks(el);
      return nodes.length ? [{ stack: nodes, unbreakable: true, margin: [0, 4, 0, 8] }] : [];
    }
    default:
      return blocks(el);
  }
}

/** Parte do bloco que deve acompanhar o título anterior e o que sobra dele. */
function headingLead(node: PdfNode): { first: PdfNode; rest?: PdfNode } | undefined {
  if ("text" in node && !("ol" in node) && !("ul" in node)) return { first: node };
  for (const kind of ["ol", "ul"] as const) {
    const items = node[kind];
    if (!Array.isArray(items) || items.length === 0) continue;
    const start = typeof node.start === "number" ? node.start : 1;
    const margin = node.margin;
    const first = { [kind]: [items[0]], ...(kind === "ol" ? { start } : {}), margin: [0, 2, 0, 0] };
    if (items.length === 1) return { first: { ...first, margin } };
    const rest = {
      [kind]: items.slice(1),
      ...(kind === "ol" ? { start: start + 1 } : {}),
      margin: [0, 0, 0, 6],
    };
    return { first, rest };
  }
  return undefined;
}

/** Blocos de um elemento: texto solto vira parágrafo; elementos de bloco são convertidos. */
export function blocks(root: Element): PdfNode[] {
  const out: PdfNode[] = [];
  let buffer: PdfNode[] = [];
  const flush = () => {
    if (hasText(buffer)) out.push({ text: buffer, margin: [0, 0, 0, 5] });
    buffer = [];
  };
  for (const child of root.childNodes) {
    if (child instanceof Element && skipped(child)) continue;
    if (child instanceof Element && BLOCK.has(child.tagName.toUpperCase())) {
      flush();
      out.push(...blockNode(child));
    } else {
      runs(child, {}, buffer);
    }
  }
  flush();
  const bound: PdfNode[] = [];
  for (const node of out) {
    const preceding = bound.at(-1);
    if (node.table && preceding?.headlineLevel) {
      bound.pop();
      tableHeading(node, preceding);
    } else if (preceding?.headlineLevel && node.unbreakable && Array.isArray(node.stack)) {
      bound.pop();
      bound.push({ ...node, stack: [preceding, ...node.stack] });
      continue;
    } else if (preceding?.headlineLevel) {
      // Título seguido de parágrafo ou lista: o título nunca fica sozinho no fim da página (o
      // contêiner da lista «começa» na página do título mesmo quando o primeiro item vai para a
      // seguinte). Amarra-se ao parágrafo ou ao primeiro item; o restante da lista continua a
      // numeração (AU-U11).
      const lead = headingLead(node);
      if (lead) {
        bound.pop();
        bound.push({ stack: [preceding, lead.first], unbreakable: true });
        if (lead.rest) bound.push(lead.rest);
        continue;
      }
    }
    bound.push(node);
  }
  return bound;
}
