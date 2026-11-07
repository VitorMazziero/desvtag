// PDF de figuras e de relatórios. A biblioteca (pdfmake, com a fonte Roboto embutida) só é
// carregada quando o usuário pede um PDF; tudo roda localmente, sem rede. As figuras entram como
// SVG vetorial (texto selecionável) e o conteúdo vem do mesmo DOM do relatório HTML.
import { blocks, CONTENT_WIDTH, type PdfNode, pdfSvg } from "./pdfContent";

type PdfMake = typeof import("pdfmake/build/pdfmake")["default"];

let engine: Promise<PdfMake> | null = null;

const fontStyles = (font: string) => [
  { text: ".", font },
  { text: ".", font, bold: true },
  { text: ".", font, italics: true },
  { text: ".", font, bold: true, italics: true },
];

async function load(): Promise<PdfMake> {
  engine ??= (async () => {
    const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    const { fontFiles } = await import("./pdfFonts");
    const bundledFonts: Record<string, string> = { ...vfs, ...fontFiles };
    const fontSource = (file: string) => {
      const encoded = bundledFonts[file];
      if (!encoded) throw new Error(`Missing bundled PDF font: ${file}`);
      // These bundled fonts' PostScript names equal their basename. PDFKit caches decoded
      // fonts by that name; the SVG callback must address the same entry, not a file path.
      const name = file.replace(/\.ttf$/, "");
      pdfMake.addVirtualFileSystem({ [name]: encoded });
      return name;
    };
    pdfMake.addFonts({
      Roboto: {
        normal: fontSource("Roboto-Regular.ttf"),
        bold: fontSource("Roboto-Medium.ttf"),
        italics: fontSource("Roboto-Italic.ttf"),
        bolditalics: fontSource("Roboto-MediumItalic.ttf"),
      },
      "DejaVu Serif": {
        normal: fontSource("DejaVuSerif.ttf"),
        bold: fontSource("DejaVuSerif-Bold.ttf"),
        italics: fontSource("DejaVuSerif-Italic.ttf"),
        bolditalics: fontSource("DejaVuSerif-BoldItalic.ttf"),
      },
      "DejaVu Sans Mono": {
        normal: fontSource("DejaVuSansMono.ttf"),
        bold: fontSource("DejaVuSansMono-Bold.ttf"),
        italics: fontSource("DejaVuSansMono-Oblique.ttf"),
        bolditalics: fontSource("DejaVuSansMono-BoldOblique.ttf"),
      },
    });
    // Sem rede: o documento nunca baixa recursos externos.
    pdfMake.setUrlAccessPolicy(() => false);
    return pdfMake;
  })();
  return engine;
}

export interface PdfInfo {
  title: string;
  subject?: string;
  keywords?: string;
  creator: string;
}

/** Uma página do tamanho da figura, sem margens: o SVG vai como desenho vetorial. */
export async function figurePdf(svg: string, info: PdfInfo): Promise<Uint8Array> {
  const pdfMake = await load();
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const width = Number(box?.[1] ?? 640);
  const height = Number(box?.[2] ?? 380);
  const font = svg.includes('font-family="DejaVu Serif')
    ? "DejaVu Serif"
    : svg.includes('font-family="DejaVu Sans Mono')
      ? "DejaVu Sans Mono"
      : "Roboto";
  return pdfMake
    .createPdf({
      info,
      pageSize: { width, height: height + 2 },
      pageMargins: [0, 0, 0, 0],
      defaultStyle: { font },
      // Register all embedded styles by PostScript name before SVG rendering.
      pageBreakBefore: (
        node: { headlineLevel?: number },
        container: { getFollowingNodesOnPage: () => unknown[] },
      ) => Boolean(node.headlineLevel && container.getFollowingNodesOnPage().length === 0),
      content: [
        {
          text: [...fontStyles(font)],
          color: "#ffffff",
          fontSize: 1,
        },
        { svg: pdfSvg(svg), width, height, absolutePosition: { x: 0, y: 0 } },
      ],
    })
    .getBuffer();
}

export interface ReportPdfInput {
  info: PdfInfo;
  title: string;
  subtitle: string;
  provenanceTitle: string;
  provenance: Array<[string, string]>;
  /** DOM já limpo do relatório (sem controles; figuras com o SVG de exportação). */
  body: HTMLElement;
  footer: string;
  /** Logotipo do grupo como crédito (PNG em `data:`); ausente = sem logotipo. */
  logoDataUri?: string;
  /** Texto do rodapé de página, por exemplo «Página 2 de 7». */
  pageLabel: (page: number, total: number) => string;
}

export async function renderReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const pdfMake = await load();
  const header: PdfNode[] = [
    ...(input.logoDataUri ? [{ image: input.logoDataUri, width: 110, margin: [0, 0, 0, 8] }] : []),
    { text: input.title, fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
    { text: input.subtitle, color: "#454c58", margin: [0, 0, 0, 8] },
  ];
  // Duas entradas por linha mantêm a proveniência junto dos resultados em páginas cheias.
  const provenanceRows: PdfNode[][] = [];
  for (let i = 0; i < input.provenance.length; i += 2) {
    const entries = input.provenance.slice(i, i + 2);
    const cells = entries.flatMap(([key, value]) => [
      { text: key, color: "#454c58" },
      { text: value },
    ]);
    if (cells.length === 2) cells.push({ text: "" }, { text: "" });
    provenanceRows.push(cells);
  }
  const provenance: PdfNode[] = [
    { text: input.provenanceTitle, fontSize: 11, bold: true, margin: [0, 14, 0, 4] },
    {
      table: {
        widths: ["auto", "*", "auto", "*"],
        body: provenanceRows,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => "#dde0e6",
      },
      fontSize: 8,
      margin: [0, 0, 0, 6],
    },
  ];
  return pdfMake
    .createPdf({
      info: input.info,
      pageSize: "A4",
      pageMargins: [40, 50, 40, 55],
      defaultStyle: { font: "Roboto", fontSize: 9.5, lineHeight: 1.2 },
      pageBreakBefore: (
        node: { headlineLevel?: number },
        container: { getFollowingNodesOnPage: () => unknown[] },
      ) => Boolean(node.headlineLevel && container.getFollowingNodesOnPage().length === 0),
      content: [
        {
          text: ["Roboto", "DejaVu Serif", "DejaVu Sans Mono"].flatMap(fontStyles),
          color: "#ffffff",
          fontSize: 1,
          absolutePosition: { x: 0, y: 0 },
        },
        ...header,
        ...blocks(input.body),
        ...(provenanceRows.length ? [{ stack: provenance, unbreakable: true }] : []),
      ],
      footer: (page: number, total: number) => ({
        stack: [
          { text: input.footer, fontSize: 8 },
          { text: input.pageLabel(page, total), fontSize: 8 },
        ],
        alignment: "center",
        color: "#454c58",
        fontSize: 8,
        margin: [40, 12, 40, 0],
        width: CONTENT_WIDTH,
      }),
    })
    .getBuffer();
}
