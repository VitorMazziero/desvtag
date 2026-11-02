// PDF de figuras e de relatórios. A biblioteca (pdfmake, com a fonte Roboto embutida) só é
// carregada quando o usuário pede um PDF; tudo roda localmente, sem rede. As figuras entram como
// SVG vetorial (texto selecionável) e o conteúdo vem do mesmo DOM do relatório HTML.
import { blocks, CONTENT_WIDTH, type PdfNode, pdfSvg } from "./pdfContent";

type PdfMake = typeof import("pdfmake/build/pdfmake")["default"];

let engine: Promise<PdfMake> | null = null;

async function load(): Promise<PdfMake> {
  engine ??= (async () => {
    const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]);
    pdfMake.addVirtualFileSystem(vfs);
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
  return pdfMake
    .createPdf({
      info,
      pageSize: { width, height: height + 2 },
      pageMargins: [0, 0, 0, 0],
      defaultStyle: { font: "Roboto" },
      // O conversor de SVG não consegue abrir fontes pelo nome fora do Node e usa a fonte corrente
      // do documento; sem texto antes do desenho ela não existe e a conversão falha. Um ponto
      // branco e invisível, antes do desenho, fixa a Roboto normal como fonte corrente (todo o
      // texto da figura sai em Roboto normal). O desenho vai em posição absoluta.
      content: [
        {
          text: [
            { text: ".", bold: true },
            { text: ".", bold: false },
          ],
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

export async function reportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const pdfMake = await load();
  const header: PdfNode[] = [
    ...(input.logoDataUri ? [{ image: input.logoDataUri, width: 110, margin: [0, 0, 0, 8] }] : []),
    { text: input.title, fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
    { text: input.subtitle, color: "#454c58", margin: [0, 0, 0, 8] },
    { text: input.provenanceTitle, fontSize: 13.5, bold: true, margin: [0, 6, 0, 4] },
    {
      table: {
        widths: [110, "*"],
        body: input.provenance.map(([key, value]) => [
          { text: key, color: "#454c58" },
          { text: value },
        ]),
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
      content: [
        ...header,
        ...blocks(input.body),
        { text: input.footer, color: "#454c58", fontSize: 8, margin: [0, 16, 0, 0] },
      ],
      footer: (page: number, total: number) => ({
        text: input.pageLabel(page, total),
        alignment: "center",
        color: "#454c58",
        fontSize: 8,
        margin: [40, 20, 40, 0],
        width: CONTENT_WIDTH,
      }),
    })
    .getBuffer();
}
