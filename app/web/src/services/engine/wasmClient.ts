import type { WorkerReply, WorkerRequest } from "../../workers/engine.worker";
import { createEngineClient, type EngineClient } from "./EngineClient";

/** Cliente do navegador: um Worker dedicado executa o motor WebAssembly. */
export function createWasmClient(): EngineClient {
  let worker = spawn();
  const pending = new Map<
    number,
    { resolve: (text: string) => void; reject: (e: Error) => void }
  >();
  let nextId = 0;

  function spawn(): Worker {
    const created = new Worker(new URL("../../workers/engine.worker.ts", import.meta.url), {
      type: "module",
    });
    created.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      const entry = pending.get(reply.id);
      if (!entry) return;
      pending.delete(reply.id);
      if (reply.ok) entry.resolve(reply.responseJson);
      else entry.reject(new Error(reply.message));
    };
    created.onerror = (event) => {
      for (const entry of pending.values()) entry.reject(new Error(event.message));
      pending.clear();
    };
    return created;
  }

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
    // Cancelar: encerra o Worker (interrompe o cálculo em curso), rejeita o que estava pendente e
    // cria um novo Worker para as próximas solicitações.
    () => {
      worker.terminate();
      for (const entry of pending.values()) entry.reject(new Error("Engine task cancelled"));
      pending.clear();
      worker = spawn();
    },
  );
}
