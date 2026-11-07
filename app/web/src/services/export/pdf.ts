// Report layout runs in a temporary worker; single-figure PDFs keep the lightweight path.
import { type ReportPdfInput, renderReportPdf } from "./pdfEngine";
import { runReportWorker } from "./reportWorker";

export { figurePdf, type PdfInfo, type ReportPdfInput } from "./pdfEngine";

export function reportPdf(input: ReportPdfInput, signal?: AbortSignal): Promise<Uint8Array> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") return renderReportPdf(input);
  const { body, pageLabel, ...rest } = input;
  const pageLabelTemplate = pageLabel(927431001, 927431002)
    .replaceAll("927431001", "\u0001")
    .replaceAll("927431002", "\u0002");
  return runReportWorker(
    { ...rest, format: "pdf", bodyHtml: body.innerHTML, pageLabelTemplate },
    signal,
  );
}
