import { invoke } from "@tauri-apps/api/core";
import { createEngineClient, type EngineClient } from "./EngineClient";

/** Cliente do Windows: comando Tauri que chama o motor Rust nativo. */
export function createTauriClient(): EngineClient {
  return createEngineClient("tauri", (requestJson) =>
    invoke<string>("engine_request", { requestJson }),
  );
}
