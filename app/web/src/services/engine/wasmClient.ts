import type { WorkerReply, WorkerRequest } from "../../workers/engine.worker";
import { createEngineClient, type EngineClient } from "./EngineClient";

/** Cliente do navegador: um Worker dedicado executa o motor WebAssembly. */
export function createWasmClient(): EngineClient {
  const worker = new Worker(new URL("../../workers/engine.worker.ts", import.meta.url), {
    type: "module",
  });
  const pending = new Map<
    number,
    { resolve: (text: string) => void; reject: (e: Error) => void }
  >();
  let nextId = 0;

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id);
    if (reply.ok) entry.resolve(reply.responseJson);
    else entry.reject(new Error(reply.message));
  };
  worker.onerror = (event) => {
    for (const entry of pending.values()) entry.reject(new Error(event.message));
    pending.clear();
  };

  return createEngineClient(
    "wasm",
    (requestJson) =>
      new Promise<string>((resolve, reject) => {
        nextId += 1;
        pending.set(nextId, { resolve, reject });
        const message: WorkerRequest = { id: nextId, requestJson };
        worker.postMessage(message);
      }),
    () => worker.terminate(),
  );
}
