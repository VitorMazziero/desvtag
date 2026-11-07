import { DOMParser, Element, Node, parseHTML } from "linkedom/worker";
import type { WorkerReport } from "../services/export/reportWorker";
import { retainReportChildren } from "./reportChildren";

self.onmessage = async (event: MessageEvent<WorkerReport>) => {
  const releaseChildren = retainReportChildren();
  try {
    const request = event.data;
    const { document } = parseHTML(
      `<!doctype html><html><head></head><body>${request.bodyHtml}</body></html>`,
    );
    // Isolated adapter for the existing DOM readers; no browser/global document is modified.
    Object.assign(globalThis, {
      document,
      Element,
      Node,
      DOMParser,
      XMLSerializer: class {
        serializeToString(node: { toString(): string }) {
          return node.toString();
        }
      },
    });
    const common = { ...request, body: document.body as unknown as HTMLElement };
    let bytes: Uint8Array;
    if (request.format === "pdf") {
      const { renderReportPdf } = await import("../services/export/pdfEngine");
      bytes = await renderReportPdf({
        ...common,
        pageLabel: (page, total) =>
          request.pageLabelTemplate
            .replaceAll("\u0001", String(page))
            .replaceAll("\u0002", String(total)),
      });
    } else {
      const { renderReportDocx } = await import("../services/export/docxEngine");
      const rasters = new Map(request.rasters?.map((raster) => [raster.key, raster]));
      bytes = await renderReportDocx({
        ...common,
        pageLabel: (page, total) =>
          request.pageLabelTemplate.replaceAll("\u0001", page).replaceAll("\u0002", total),
        rasterize: async (svg) => {
          const key = /data-report-raster-key=["']([^"']+)["']/.exec(svg)?.[1];
          const raster = key === undefined ? undefined : rasters.get(key);
          if (!raster) throw new Error("Missing locally rasterized report figure");
          return raster;
        },
      });
    }
    const transferred = Uint8Array.from(bytes);
    self.postMessage({ ok: true, bytes: transferred }, [transferred.buffer]);
  } catch (error) {
    self.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : "Report generation failed",
    });
  } finally {
    releaseChildren();
  }
};
