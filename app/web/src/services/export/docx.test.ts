import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { pngSize, reportDocx } from "./docx";

// PNG mínimo (1x1) para o logotipo e para a figura rasterizada de mentira.
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const png = (): Uint8Array => Uint8Array.from(atob(PIXEL), (c) => c.charCodeAt(0));

function body(html: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
}

async function build(html: string, options: { logo?: boolean } = {}) {
  const calls: Array<{ width: number; height: number }> = [];
  const bytes = await reportDocx({
    info: { title: "Ensaio — Relatório", subject: "Subtítulo", keywords: "a=b", creator: "Teste" },
    title: "Ensaio — Relatório",
    subtitle: "Subtítulo",
    provenanceTitle: "Proveniência",
    provenance: [
      ["app", "EnziTAG Optima 0.3.0"],
      ["method", "anova v1"],
    ],
    body: body(html),
    footer: "Gerado pelo EnziTAG Optima",
    logoDataUri: options.logo ? `data:image/png;base64,${PIXEL}` : undefined,
    pageLabel: (page, total) => `Página ${page} de ${total}`,
    rasterize: async (_svg, width, height) => {
      calls.push({ width, height });
      return { bytes: png(), width, height };
    },
  });
  const files = unzipSync(bytes);
  const text = (name: string) => strFromU8(files[name] ?? new Uint8Array());
  return { files, document: text("word/document.xml"), text, calls };
}

describe("reportDocx", () => {
  it("writes a valid package with the report text, headings and provenance", async () => {
    const out = await build(
      "<h2>Resultados</h2><p>Valor <strong>importante</strong> e <em>nota</em>.</p>",
    );
    expect(Object.keys(out.files)).toEqual(
      expect.arrayContaining(["[Content_Types].xml", "word/document.xml", "docProps/core.xml"]),
    );
    expect(out.document).toContain("Ensaio — Relatório");
    expect(out.document).toContain("EnziTAG Optima 0.3.0");
    expect(out.document).toContain("anova v1");
    expect(out.document).toContain("Resultados");
    expect(out.document).toContain('w:val="Heading2"');
    expect(out.document).toContain("importante");
    expect(out.document).toMatch(/<w:b\/>/);
    expect(out.document).toMatch(/<w:i\/>/);
    expect(out.text("docProps/core.xml")).toContain("Subtítulo");
  });

  it("places the short provenance after the results", async () => {
    const out = await build("<h2>Resultados</h2><p>Texto do resultado.</p>");
    const at = (text: string) => out.document.indexOf(text);
    expect(at("Texto do resultado.")).toBeGreaterThan(at("Subtítulo"));
    expect(at("Proveniência")).toBeGreaterThan(at("Texto do resultado."));
    expect(at("EnziTAG Optima 0.3.0")).toBeGreaterThan(at("Proveniência"));
  });

  it("keeps the table header row, numeric alignment and caption", async () => {
    const out = await build(
      "<table><caption>ANOVA</caption><thead><tr><th>Termo</th><th>p</th></tr></thead>" +
        '<tbody><tr><th scope="row">Dose</th><td class="num">0,01</td></tr></tbody></table>',
    );
    expect(out.document).toContain("ANOVA");
    expect(out.document).toContain("<w:tblHeader");
    expect(out.document).toContain('<w:jc w:val="right"/>');
    expect(out.document).toContain("0,01");
  });

  it("converts bullet and numbered lists, each numbered list restarting at 1", async () => {
    const out = await build(
      "<ul><li>um</li><li>dois</li></ul><ol><li>a</li></ol><ol><li>b</li></ol>",
    );
    expect(out.document).toContain("<w:numPr>");
    const numbering = out.text("word/numbering.xml");
    expect(numbering).toContain('w:numFmt w:val="decimal"');
    // Duas listas numeradas = duas instâncias distintas da mesma numeração, cada uma reiniciando em 1.
    const ordered = numbering.match(
      /<w:num w:numId="\d+"><w:abstractNumId w:val="2"\/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"\/>/g,
    );
    expect(ordered).toHaveLength(2);
  });

  it("embeds figures as PNG at their natural size and skips hidden text", async () => {
    const out = await build(
      '<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380"><text>x</text></svg></figure>' +
        '<p class="sr-only">oculto</p><p>visível</p>',
    );
    expect(out.calls).toEqual([{ width: 640, height: 380 }]);
    expect(Object.keys(out.files).filter((f) => f.startsWith("word/media/"))).toHaveLength(1);
    expect(out.document).toContain("visível");
    expect(out.document).not.toContain("oculto");
    // 640 px = 6096000 EMU (9525 EMU por pixel).
    expect(out.document).toContain('cx="6096000"');
  });

  it("scales wide figures to the printable width", async () => {
    const out = await build(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1286 600"><text>x</text></svg>',
    );
    expect(out.document).toContain(`cx="${643 * 9525}"`);
  });

  it("adds the logo only when requested and fills the page number fields", async () => {
    const without = await build("<p>x</p>");
    const withLogo = await build("<p>x</p>", { logo: true });
    const media = (o: typeof without) =>
      Object.keys(o.files).filter((f) => f.startsWith("word/media/")).length;
    expect(media(without)).toBe(0);
    expect(media(withLogo)).toBe(1);
    const footer = withLogo.text("word/footer1.xml");
    expect(footer).toContain("Página");
    expect(footer).toContain("PAGE");
    expect(footer).toContain("NUMPAGES");
    expect(footer).toContain("Gerado pelo EnziTAG Optima");
    expect(withLogo.document).not.toContain("Gerado pelo EnziTAG Optima");
  });
});

describe("pngSize", () => {
  it("reads the size from the IHDR chunk", () => {
    expect(pngSize(png())).toEqual({ width: 1, height: 1 });
  });
});

it("writes all rows and columns of a 33-column table in readable repeated-reference bands", async () => {
  const html = `<table><thead><tr>${Array.from({ length: 33 }, (_, c) => `<th>C${c}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: 41 }, (_, r) => `<tr>${Array.from({ length: 33 }, (_, c) => `<td>value-${r}-${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const out = await build(html);
  for (let r = 0; r < 41; r++)
    for (let c = 1; c < 33; c++) expect(out.document).toContain(`value-${r}-${c}</w:t>`);
  expect(out.document.match(/value-0-0<\/w:t>/g)).toHaveLength(7);
  expect(out.document).toContain('w:sz w:val="18"');
  expect(out.document).not.toContain('w:sz w:val="14"');
});
