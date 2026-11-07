import type { WorkerReply, WorkerRequest } from "../../workers/engine.worker";
import { createEngineClient, type EngineClient, type Transport } from "./EngineClient";
import { isServiceRequest, queuedTransport } from "./taskQueue";

/** One active request per worker; cancel/error cannot reject a different channel's request. */
function workerTransport() {
  let worker: Worker | undefined;
  let nextId = 0;
  const dispose = () => {
    worker?.terminate();
    worker = undefined;
  };
  const execute: Transport = (requestJson, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("Engine task cancelled"));
        return;
      }
      try {
        worker ??= new Worker(new URL("../../workers/engine.worker.ts", import.meta.url), {
          type: "module",
        });
        const current = worker;
        const id = ++nextId;
        const cleanup = () => {
          signal.removeEventListener("abort", onAbort);
          current.onmessage = null;
          current.onerror = null;
          current.onmessageerror = null;
        };
        const fail = (message: string) => {
          cleanup();
          dispose();
          reject(new Error(message));
        };
        const onAbort = () => fail("Engine task cancelled");
        signal.addEventListener("abort", onAbort, { once: true });
        current.onmessage = (event: MessageEvent<WorkerReply>) => {
          const reply = event.data;
          if (reply.id !== id) return;
          if (reply.ok) {
            cleanup();
            resolve(reply.responseJson);
          } else fail(reply.message);
        };
        current.onerror = (event) => {
          event.preventDefault();
          fail(event.message || "Engine worker failed");
        };
        current.onmessageerror = () => fail("Engine worker message could not be decoded");
        const message: WorkerRequest = { id, requestJson };
        try {
          current.postMessage(message);
        } catch {
          fail("Engine worker could not accept the request");
        }
      } catch (error) {
        dispose();
        reject(error);
      }
    });
  return { request: queuedTransport(execute), dispose };
}

export function createWasmClient(): EngineClient {
  const scientific = workerTransport();
  const service = workerTransport();
  return createEngineClient(
    "wasm",
    (json, signal) => (isServiceRequest(json) ? service : scientific).request(json, signal),
    () => {
      scientific.dispose();
      service.dispose();
    },
  );
}
