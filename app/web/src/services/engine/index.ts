// API pública do serviço de motor (U12).

import type { EngineClient } from "./EngineClient";
import { createTauriClient } from "./tauriClient";
import { createWasmClient } from "./wasmClient";

export * from "./contracts.generated";
export {
  createEngineClient,
  type EngineClient,
  type EngineKind,
  ProtocolError,
  parseResponse,
  StaleResponseError,
  type Transport,
} from "./EngineClient";

/** O Tauri injeta `__TAURI_INTERNALS__` na janela do aplicativo Windows. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Cria o cliente adequado ao ambiente. */
export function createDefaultEngineClient(): EngineClient {
  return isTauri() ? createTauriClient() : createWasmClient();
}
