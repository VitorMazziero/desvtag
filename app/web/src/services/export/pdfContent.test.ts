import { describe, expect, it } from "vitest";
import { blocks, type PdfNode, pdfSvg } from "./pdfContent";

function root(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

describe("pdfSvg", () => {
  it("embeds the PDF font in every text", () => {
    const out = pdfSvg('<svg font-family="sans-serif"><text font-family="inherit">a</text></svg>');
    expect(out).not.toContain("sans-serif");
    expect(out).not.toContain("inherit");
    expect(out.match(/font-family="Roboto"/g)).toHaveLength(2);
  });

  it("preserves hatching as clipped lines rather than a solid uncertainty fill", () => {
    const svg =
      '<svg><defs><pattern id="c-hatch"><line x1="0" y1="0" x2="0" y2="6" stroke="#9a3412"/></pattern></defs>' +
      '<rect width="5" height="5" fill="url(#c-hatch)" fill-opacity="0.55"/></svg>';
    const out = pdfSvg(svg);
    expect(out).toContain('data-pdf-hatch="true"');
    expect(out).toContain('stroke="#9a3412"');
    expect(out).toContain("<clipPath");
    expect(out).not.toContain("<pattern");
    expect(out).not.toContain('fill="#9a3412"');
  });

  it("draws the text halo as a stroked copy under a plain copy", () => {
    const svg =
      '<svg><text x="1" y="2" fill="#000" stroke="#fff" stroke-width="3" paint-order="stroke" stroke-linejoin="round">Z</text></svg>';
    const out = pdfSvg(svg);
    expect(out).not.toContain("paint-order");
    const texts = out.match(/<text[^>]*>Z<\/text>/g) ?? [];
    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain('stroke="#fff"');
    expect(texts[1]).not.toContain("stroke");
  });
});

describe("blocks", () => {
  it("keeps a short report introduction and its summary table together", () => {
    const nodes = blocks(
      root(
        "<div data-report-keep-together><h3>Precisão</h3><p>Perfil a4</p>" +
          "<table><thead><tr><th>Bloco</th></tr></thead>" +
          "<tbody><tr><td>Depois</td></tr></tbody></table></div><p>Dados fonte</p>",
      ),
    );
    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({ unbreakable: true });
    // Título e parágrafo formam um subgrupo (o título nunca fica só); a tabela vem depois.
    const stack = nodes[0]?.stack as PdfNode[];
    expect(stack).toHaveLength(2);
    expect(stack[0]).toMatchObject({ unbreakable: true });
    expect(stack[1]?.table).toBeDefined();
  });

  it("converts headings, paragraphs with emphasis and lists", () => {
    const nodes = blocks(
      root(
        "<h2>Resultados</h2><p>Valor <strong>importante</strong> e <em>nota</em>.</p>" +
          "<ul><li>um</li><li>dois</li></ul>",
      ),
    );
    expect(nodes).toHaveLength(2);
    const lead = nodes[0]?.stack as PdfNode[];
    expect(nodes[0]).toMatchObject({ unbreakable: true });
    expect(lead[0]).toMatchObject({ fontSize: 13.5 });
    const runs = (lead[1]?.text ?? []) as Array<{
      text: string;
      bold?: boolean;
      italics?: boolean;
    }>;
    expect(runs.map((r) => r.text).join("")).toBe("Valor importante e nota.");
    expect(runs.find((r) => r.text === "importante")?.bold).toBe(true);
    expect(runs.find((r) => r.text === "nota")?.italics).toBe(true);
    expect(nodes[1]?.ul as unknown[]).toHaveLength(2);
  });

  it("converts a table with header, numeric alignment and caption", () => {
    const nodes = blocks(
      root(
        "<table><caption>ANOVA</caption><thead><tr><th>Termo</th><th>p</th></tr></thead>" +
          '<tbody><tr><th scope="row">Dose</th><td class="num">0,01</td></tr></tbody></table>',
      ),
    );
    const table = nodes[0]?.table as {
      headerRows: number;
      body: Array<Array<{ alignment: string; text?: string; bold?: boolean }>>;
    };
    expect(table.headerRows).toBe(2);
    expect(table.body).toHaveLength(3);
    expect(table.body[0]?.[0]).toMatchObject({ text: "ANOVA", bold: true });
    expect(table.body[2]?.[1]?.alignment).toBe("right");
  });

  it("keeps figures as vector SVG at their natural width and skips hidden text", () => {
    const nodes = blocks(
      root(
        '<figure><div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380"><text>x</text></svg></div></figure>' +
          '<p class="sr-only">oculto</p><p>visível</p>',
      ),
    );
    const figure = nodes[0] as {
      stack: Array<{ svg: string; width: number }>;
      unbreakable: boolean;
    };
    expect(figure.unbreakable).toBe(true);
    expect(figure.stack[0]?.width).toBe(515);
    expect(figure.stack[0]?.svg).toContain("<text");
    expect(nodes).toHaveLength(2);
  });
});

it("keeps section titles and captions inside the repeated header with the first data row", () => {
  const nodes = blocks(
    root(
      "<h3>Comparisons</h3><div><table><caption>Same row across parts</caption><thead><tr><th>Group</th><th>p</th></tr></thead><tbody><tr><td>A</td><td>0.1</td></tr></tbody></table></div>",
    ),
  );
  expect(nodes).toHaveLength(1);
  const table = nodes[0]?.table as {
    headerRows: number;
    keepWithHeaderRows: number;
    body: PdfNode[][];
  };
  expect(table.headerRows).toBe(3);
  expect(table.keepWithHeaderRows).toBe(1);
  expect(JSON.stringify(table.body[0])).toContain("Comparisons");
  expect(JSON.stringify(table.body[1])).toContain("Same row across parts");
});

it("keeps table headers with the first row and fits wide bands without reducing the reading size", () => {
  const headers = Array.from({ length: 33 }, (_, i) => `<th>X${i}</th>`).join("");
  const cells = Array.from(
    { length: 33 },
    (_, i) => `<td class="num">1.23456789e+${i + 100}</td>`,
  ).join("");
  const nodes = blocks(
    root(`<table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table>`),
  );
  expect(nodes).toHaveLength(7);
  for (const node of nodes) {
    expect(node.fontSize).toBe(9);
    const table = node.table as {
      widths: number[];
      headerRows: number;
      keepWithHeaderRows: number;
      dontBreakRows: boolean;
    };
    expect(table.headerRows).toBe(1);
    expect(table.keepWithHeaderRows).toBe(1);
    expect(table.dontBreakRows).toBe(true);
    expect(table.widths.reduce((a, b) => a + b, 0) + table.widths.length * 7).toBeLessThanOrEqual(
      515,
    );
  }
});

it("does not require a nonexistent data row when a saved table only has its header", () => {
  const table = blocks(
    root("<table><thead><tr><th>Term</th><th>Estimate</th></tr></thead><tbody></tbody></table>"),
  )[0]?.table as { keepWithHeaderRows: number; body: unknown[] };
  expect(table.keepWithHeaderRows).toBe(0);
  expect(table.body).toHaveLength(1);
});

it("gives long term labels room without squeezing numeric columns, and keeps paper ordinals compact", () => {
  const table = blocks(
    root(
      '<table><thead><tr><th>Term</th><th>df</th><th>F</th><th>df2</th><th>p</th></tr></thead><tbody><tr><td>Group[A]:Occasion[Before]; Group[A]:Occasion[During]</td><td class="num">4</td><td class="num">1.2</td><td class="num">54</td><td class="num">0.1</td></tr></tbody></table>',
    ),
  )[0]?.table as { widths: number[] };
  expect(table.widths[0]).toBeGreaterThan(table.widths[1] ?? 0);
  expect(table.widths.slice(1).every((w) => w >= 72)).toBe(true);
});

it("keeps a figure heading in the same pagination block as its chart", () => {
  const nodes = blocks(
    root('<h3>Surface</h3><figure><svg viewBox="0 0 640 380"><text>x</text></svg></figure>'),
  );
  expect(nodes).toHaveLength(1);
  expect(nodes[0]).toMatchObject({
    unbreakable: true,
    stack: [{ text: [{ text: "Surface" }] }, { width: 515 }],
  });
});

it("keeps two short table rows with their section heading and repeated column header", () => {
  const nodes = blocks(
    root(
      "<h3>Predictions</h3><table><thead><tr><th>Run</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>",
    ),
  );
  expect(nodes).toHaveLength(1);
  expect(nodes[0]?.table).toMatchObject({
    headerRows: 2,
    keepWithHeaderRows: 2,
    dontBreakRows: true,
  });
});

it("keeps a heading with the first item of the list that follows and continues the numbering", () => {
  const nodes = blocks(root("<h3>Steps</h3><ol><li>one</li><li>two</li><li>three</li></ol>"));
  expect(nodes).toHaveLength(2);
  expect(nodes[0]).toMatchObject({
    unbreakable: true,
    stack: [{ text: [{ text: "Steps" }] }, { ol: [{ text: [{ text: "one" }] }], start: 1 }],
  });
  expect(nodes[1]).toMatchObject({
    ol: [{ text: [{ text: "two" }] }, { text: [{ text: "three" }] }],
    start: 2,
  });
});

it("keeps a heading with the paragraph that follows", () => {
  const nodes = blocks(root("<h3>Note</h3><p>Body text.</p>"));
  expect(nodes).toHaveLength(1);
  expect(nodes[0]).toMatchObject({ unbreakable: true });
});
