import { invoke } from "@tauri-apps/api/core";
import { createEngineClient, type EngineClient, type Transport } from "./EngineClient";
import { isServiceRequest, queuedTransport } from "./taskQueue";

/** A cancelled invoke keeps its queue slot until native CPU work actually ends. */
export function createTauriClient(): EngineClient {
  const execute: Transport = (requestJson) => invoke<string>("engine_request", { requestJson });
  const scientific = queuedTransport(execute);
  const service = queuedTransport(execute);
  return createEngineClient("tauri", (json, signal) =>
    (isServiceRequest(json) ? service : scientific)(json, signal),
  );
}
