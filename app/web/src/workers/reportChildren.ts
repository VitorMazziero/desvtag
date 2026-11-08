/** Keep asynchronous PNG decompression alive while the parent renders SVG (Firefox).
 * This adapter is installed only inside the short-lived report worker. */
export function retainReportChildren() {
  const NativeWorker = globalThis.Worker;
  const children = new Set<Worker>();
  class ReportChild extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      children.add(this);
      this.addEventListener("error", (event) => {
        self.postMessage({ ok: false, message: event.message || "Report image decoding failed" });
      });
    }
    override terminate() {
      children.delete(this);
      super.terminate();
    }
  }
  globalThis.Worker = ReportChild;
  return () => {
    for (const child of children) child.terminate();
    globalThis.Worker = NativeWorker;
  };
}
