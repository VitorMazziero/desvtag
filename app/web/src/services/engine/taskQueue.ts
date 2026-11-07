import type { Transport } from "./EngineClient";

/** Cancellation settles the caller immediately; an executing native job still occupies its slot. */
export function queuedTransport(execute: Transport, limit = 64): Transport {
  interface Job {
    json: string;
    signal: AbortSignal;
    resolve: (value: string) => void;
    reject: (reason: Error) => void;
    cleanup: () => void;
  }
  const waiting: Job[] = [];
  let active: Job | undefined;
  const cancelled = () => new Error("Engine task cancelled");
  function pump() {
    if (active) return;
    const job = waiting.shift();
    if (!job) return;
    active = job;
    Promise.resolve()
      .then(() => {
        if (job.signal.aborted) throw cancelled();
        return execute(job.json, job.signal);
      })
      .then(
        (value) => {
          if (!job.signal.aborted) job.resolve(value);
        },
        (error) => {
          if (!job.signal.aborted) job.reject(error);
        },
      )
      .finally(() => {
        job.cleanup();
        active = undefined;
        pump();
      });
  }
  return (json, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(cancelled());
        return;
      }
      if (waiting.length >= limit) {
        reject(new Error("Engine task queue full"));
        return;
      }
      const job: Job = {
        json,
        signal,
        resolve,
        reject,
        cleanup: () => signal.removeEventListener("abort", onAbort),
      };
      function onAbort() {
        const index = waiting.indexOf(job);
        if (index >= 0) {
          waiting.splice(index, 1);
          job.cleanup();
        }
        reject(cancelled());
      }
      signal.addEventListener("abort", onAbort, { once: true });
      waiting.push(job);
      pump();
    });
}

/** Cheap engine metadata and file work remain independent of long scientific operations. */
export function isServiceRequest(json: string): boolean {
  const type = JSON.parse(json).operation.type as string;
  return (
    type === "engineInfo" ||
    type.startsWith("project") ||
    type.startsWith("import") ||
    type === "exportXlsx"
  );
}
