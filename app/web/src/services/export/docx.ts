// Relatório em Word (.docx). A biblioteca `docx` roda no próprio dispositivo, sem rede, e este
// módulo só é carregado quando o usuário pede o arquivo. O conteúdo vem do mesmo DOM limpo do
// relatório HTML e do PDF; as figuras entram como PNG (rasterizadas a 2x).
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { blocks, type DocxBlock, NUMBERING_ORDERED, type Rasterizer } from "./docxContent";
import { svgToPng } from "./png";

const MUTED = "454C58";
const FONT = "Calibri";

export interface DocxInfo {
  title: string;
  subject?: string;
  keywords?: string;
  creator: string;
}

export interface ReportDocxInput {
  info: DocxInfo;
  title: string;
  subtitle: string;
  provenanceTitle: string;
  provenance: Array<[string, string]>;
  /** DOM já limpo do relatório (sem controles; figuras com o SVG de exportação). */
  body: HTMLElement;
  footer: string;
  /** Logotipo do grupo como crédito (PNG em `data:`); ausente = sem logotipo. */
  logoDataUri?: string;
  /** Texto do rodapé de página; recebe marcadores para o número da página e o total. */
  pageLabel: (page: string, total: string) => string;
  /** Rasterizador de figuras; por padrão desenha o SVG num canvas do navegador. */
  rasterize?: Rasterizer;
}

/** Marcadores trocados pelos campos de página do Word. */
const PAGE = "\u0001";
const TOTAL = "\u0002";

const browserRaster: Rasterizer = async (svg, width, height) => ({
  bytes: await svgToPng(svg, width, height, 2),
  width,
  height,
});

/** Largura e altura (px) de um PNG, lidas do cabeçalho IHDR. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function dataUriBytes(uri: string): Uint8Array {
  const base64 = uri.slice(uri.indexOf(",") + 1);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function pageFooter(label: string): Footer {
  const children: TextRun[] = [];
  for (const piece of label.split(new RegExp(`(${PAGE}|${TOTAL})`))) {
    if (piece === PAGE)
      children.push(new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }));
    else if (piece === TOTAL)
      children.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED }));
    else if (piece !== "") children.push(new TextRun({ text: piece, size: 16, color: MUTED }));
  }
  return new Footer({
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children })],
  });
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;
const ruled = { style: BorderStyle.SINGLE, size: 4, color: "DDE0E6" } as const;

function provenanceTable(rows: Array<[string, string]>): Table {
  const cell = (text: string, muted: boolean, width: number) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, left: noBorder, right: noBorder, bottom: ruled },
      margins: { top: 30, bottom: 30, left: 60, right: 60 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, size: 16, color: muted ? MUTED : undefined })],
        }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2000, 7000],
    rows: rows.map(
      ([key, value]) =>
        new TableRow({ cantSplit: true, children: [cell(key, true, 22), cell(value, false, 78)] }),
    ),
  });
}

export async function reportDocx(input: ReportDocxInput): Promise<Uint8Array> {
  const rasterize = input.rasterize ?? browserRaster;
  const header: DocxBlock[] = [];
  if (input.logoDataUri) {
    const logo = dataUriBytes(input.logoDataUri);
    const size = pngSize(logo);
    const width = 147; // 110 pt, como no PDF
    header.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: logo,
            transformation: { width, height: Math.round((width * size.height) / size.width) },
            altText: { name: "logotipo", title: "EnziTAG", description: "EnziTAG Optima" },
          }),
        ],
      }),
    );
  }
  header.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: input.title, bold: true, size: 36 })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: input.subtitle, size: 20, color: MUTED })],
    }),
  );

  const body = await blocks(input.body, { rasterize, orderedLists: 0 });
  const document = new Document({
    title: input.info.title,
    subject: input.info.subject,
    keywords: input.info.keywords,
    creator: input.info.creator,
    description: input.info.subject,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    numbering: {
      config: [
        {
          reference: NUMBERING_ORDERED,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 540, hanging: 270 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 em twips
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 }, // 2 cm
          },
        },
        footers: { default: pageFooter(input.pageLabel(PAGE, TOTAL)) },
        children: [
          ...header,
          ...body,
          // Proveniência sucinta **no fim**, depois dos resultados.
          new Paragraph({
            spacing: { before: 280, after: 80 },
            keepNext: true,
            children: [new TextRun({ text: input.provenanceTitle, bold: true, size: 23 })],
          }),
          provenanceTable(input.provenance),
          new Paragraph({
            spacing: { before: 320 },
            children: [new TextRun({ text: input.footer, size: 16, color: MUTED })],
          }),
        ],
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
