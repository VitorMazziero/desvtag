// Worker do navegador: carrega o WASM uma vez e responde a solicitações em texto.
// O cálculo roda aqui, fora da thread da interface.
import init, { handleRequest } from "../services/engine/wasm/desvtag_wasm.js";
import wasmUrl from "../services/engine/wasm/desvtag_wasm_bg.wasm?url";

export interface WorkerRequest {
  id: number;
  requestJson: string;
}
export type WorkerReply =
  | { id: number; ok: true; responseJson: string }
  | { id: number; ok: false; message: string };

const ready = init({ module_or_path: wasmUrl });

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, requestJson } = event.data;
  try {
    await ready;
    const reply: WorkerReply = { id, ok: true, responseJson: handleRequest(requestJson) };
    self.postMessage(reply);
  } catch (error) {
    const reply: WorkerReply = {
      id,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
};
