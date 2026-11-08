// Rasterize local figures first, then build the Word package outside the UI thread.
import type { ReportDocxInput } from "./docxEngine";
import { svgToPng } from "./png";
import { type ReportRaster, runReportWorker } from "./reportWorker";
import { svgPixelBox } from "./svgSize";

export type { DocxInfo, ReportDocxInput } from "./docxEngine";
export { pngSize } from "./png";

export async function reportDocx(
  input: ReportDocxInput,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined" || input.rasterize) {
    const { renderReportDocx } = await import("./docxEngine");
    return renderReportDocx(input);
  }
  const { body, pageLabel, rasterize: _rasterize, ...rest } = input;
  const rasters: ReportRaster[] = [];
  for (const [index, svg] of [...body.querySelectorAll("svg")].entries()) {
    signal?.throwIfAborted();
    const key = String(index);
    svg.setAttribute("data-report-raster-key", key);
    const source = new XMLSerializer().serializeToString(svg);
    const { width, height } = svgPixelBox(svg);
    rasters.push({ key, width, height, bytes: await svgToPng(source, width, height, 2) });
  }
  signal?.throwIfAborted();
  return runReportWorker(
    {
      ...rest,
      format: "docx",
      bodyHtml: body.innerHTML,
      pageLabelTemplate: pageLabel("\u0001", "\u0002"),
      rasters,
    },
    signal,
  );
}
