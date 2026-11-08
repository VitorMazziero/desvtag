import { afterEach, expect, it, vi } from "vitest";
import type { WorkerReport } from "./reportWorker";

class MockWorker {
  static all: MockWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    MockWorker.all.push(this);
  }
}
const request: WorkerReport = {
  format: "pdf",
  info: { title: "Report", creator: "test" },
  title: "Report",
  subtitle: "",
  provenanceTitle: "Source",
  provenance: [],
  bodyHtml: "<p>Result</p>",
  footer: "",
  pageLabelTemplate: "Page \u0001 of \u0002",
};
afterEach(() => {
  vi.unstubAllGlobals();
  MockWorker.all = [];
});
async function client() {
  vi.resetModules();
  vi.stubGlobal("Worker", MockWorker);
  return import("./reportWorker");
}

it("terminates actual pending report work on abort, ignores its late reply and permits the next job", async () => {
  const { runReportWorker } = await client();
  const controller = new AbortController();
  const pending = runReportWorker(request, controller.signal);
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
  const first = MockWorker.all[0];
  expect(first?.postMessage).toHaveBeenCalledWith(request);
  controller.abort();
  await rejected;
  expect(first?.terminate).toHaveBeenCalledOnce();
  const next = runReportWorker(request);
  first?.onmessage?.({ data: { ok: true, bytes: new Uint8Array([9]) } } as MessageEvent);
  await expect(runReportWorker(request)).rejects.toThrow("already being generated");
  MockWorker.all[1]?.onmessage?.({
    data: { ok: true, bytes: new Uint8Array([1, 2]) },
  } as MessageEvent);
  await expect(next).resolves.toEqual(new Uint8Array([1, 2]));
});

it("releases the report context after a worker error and a subsequent export succeeds", async () => {
  const { runReportWorker } = await client();
  const pending = runReportWorker(request);
  const failed = expect(pending).rejects.toThrow("Rendering failed");
  MockWorker.all[0]?.onerror?.(new ErrorEvent("error", { message: "Rendering failed" }));
  await failed;
  expect(MockWorker.all[0]?.terminate).toHaveBeenCalledOnce();
  const next = runReportWorker(request);
  MockWorker.all[1]?.onmessage?.({
    data: { ok: true, bytes: new Uint8Array([3]) },
  } as MessageEvent);
  await expect(next).resolves.toEqual(new Uint8Array([3]));
});
