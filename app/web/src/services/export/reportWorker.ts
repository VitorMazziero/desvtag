export interface ReportRaster {
  key: string;
  bytes: Uint8Array;
  width: number;
  height: number;
}
export interface WorkerReport {
  format: "pdf" | "docx";
  info: { title: string; subject?: string; keywords?: string; creator: string };
  title: string;
  subtitle: string;
  provenanceTitle: string;
  provenance: Array<[string, string]>;
  bodyHtml: string;
  footer: string;
  logoDataUri?: string;
  pageLabelTemplate: string;
  rasters?: ReportRaster[];
}

let active = false;
/** One temporary report context; terminating it releases library/DOM allocations after each job. */
export function runReportWorker(request: WorkerReport, signal?: AbortSignal): Promise<Uint8Array> {
  if (signal?.aborted) return Promise.reject(new DOMException("Report cancelled", "AbortError"));
  if (active) return Promise.reject(new Error("A report is already being generated"));
  active = true;
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined;
    let settled = false;
    const finish = (bytes?: Uint8Array, error?: unknown) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", cancel);
      worker?.terminate();
      active = false;
      if (bytes) resolve(bytes);
      else reject(error);
    };
    const cancel = () => finish(undefined, new DOMException("Report cancelled", "AbortError"));
    try {
      worker = new Worker(new URL("../../workers/report.worker.ts", import.meta.url), {
        type: "module",
      });
      signal?.addEventListener("abort", cancel, { once: true });
      worker.onmessage = (
        event: MessageEvent<{ ok: boolean; bytes?: Uint8Array; message?: string }>,
      ) => {
        const reply = event.data;
        if (reply.ok && reply.bytes instanceof Uint8Array) finish(reply.bytes);
        else finish(undefined, new Error(reply.message ?? "Report worker failed"));
      };
      worker.onerror = (event) => {
        event.preventDefault();
        finish(undefined, new Error(event.message || "Report worker failed"));
      };
      worker.onmessageerror = () =>
        finish(undefined, new Error("Report worker reply could not be decoded"));
      worker.postMessage(request);
    } catch (error) {
      finish(undefined, error);
    }
  });
}
