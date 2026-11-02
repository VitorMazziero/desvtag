import { describe, expect, it } from "vitest";
import { blocks, pdfSvg } from "./pdfContent";

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

  it("replaces the hatch pattern by a translucent fill in the pattern colour", () => {
    const svg =
      '<svg><defs><pattern id="c-hatch"><line x1="0" y1="0" x2="0" y2="6" stroke="#9a3412"/></pattern></defs>' +
      '<rect width="5" height="5" fill="url(#c-hatch)" fill-opacity="0.55"/></svg>';
    const out = pdfSvg(svg);
    expect(out).toContain('<rect width="5" height="5" fill="#9a3412" fill-opacity="0.3"/>');
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
  it("converts headings, paragraphs with emphasis and lists", () => {
    const nodes = blocks(
      root(
        "<h2>Resultados</h2><p>Valor <strong>importante</strong> e <em>nota</em>.</p>" +
          "<ul><li>um</li><li>dois</li></ul>",
      ),
    );
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toMatchObject({ fontSize: 13.5 });
    const runs = (nodes[1]?.text ?? []) as Array<{
      text: string;
      bold?: boolean;
      italics?: boolean;
    }>;
    expect(runs.map((r) => r.text).join("")).toBe("Valor importante e nota.");
    expect(runs.find((r) => r.text === "importante")?.bold).toBe(true);
    expect(runs.find((r) => r.text === "nota")?.italics).toBe(true);
    expect(nodes[2]?.ul as unknown[]).toHaveLength(2);
  });

  it("converts a table with header, numeric alignment and caption", () => {
    const nodes = blocks(
      root(
        "<table><caption>ANOVA</caption><thead><tr><th>Termo</th><th>p</th></tr></thead>" +
          '<tbody><tr><th scope="row">Dose</th><td class="num">0,01</td></tr></tbody></table>',
      ),
    );
    expect(nodes[0]).toMatchObject({ text: "ANOVA", bold: true });
    const table = nodes[1]?.table as {
      headerRows: number;
      body: Array<Array<{ alignment: string }>>;
    };
    expect(table.headerRows).toBe(1);
    expect(table.body).toHaveLength(2);
    expect(table.body[1]?.[1]?.alignment).toBe("right");
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
