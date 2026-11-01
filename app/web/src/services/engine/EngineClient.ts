// Contrato único entre a interface e o motor (U12). Os adaptadores (Worker WASM
// no navegador, comando Tauri no Windows) só transportam texto JSON.
import {
  type EngineRequest,
  type EngineResponse,
  type Operation,
  PROTOCOL_VERSION,
} from "./contracts.generated";

/** Transporte de texto: envia a solicitação JSON e devolve a resposta JSON. */
export type Transport = (requestJson: string) => Promise<string>;

/** Ambiente em que o cliente executa o motor. */
export type EngineKind = "wasm" | "tauri";

export interface EngineClient {
  readonly kind: EngineKind;
  /**
   * Executa uma operação. Se outra solicitação do mesmo `channel` for feita
   * antes da resposta, esta é descartada com {@link StaleResponseError}.
   */
  request(operation: Operation, options?: { channel?: string }): Promise<EngineResponse>;
  dispose(): void;
}

/** A resposta pertence a uma tarefa já substituída ou cancelada. */
export class StaleResponseError extends Error {
  constructor(readonly taskId: string) {
    super(`Stale response discarded for task ${taskId}`);
    this.name = "StaleResponseError";
  }
}

/** A resposta do motor não tem a forma do protocolo. */
export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

let counter = 0;
function nextTaskId(): string {
  counter += 1;
  return `task-${Date.now().toString(36)}-${counter}`;
}

/** Verificação mínima em tempo de execução: tipos TypeScript não validam dados externos. */
export function parseResponse(text: string): EngineResponse {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ProtocolError("Engine response is not valid JSON");
  }
  if (typeof value !== "object" || value === null) {
    throw new ProtocolError("Engine response is not an object");
  }
  const record = value as Record<string, unknown>;
  const outcome = record.outcome as Record<string, unknown> | undefined;
  if (
    typeof record.protocolVersion !== "number" ||
    typeof outcome !== "object" ||
    outcome === null ||
    (outcome.status !== "ok" && outcome.status !== "error")
  ) {
    throw new ProtocolError("Engine response has an unexpected shape");
  }
  return value as EngineResponse;
}

export function createEngineClient(
  kind: EngineKind,
  transport: Transport,
  dispose: () => void = () => {},
): EngineClient {
  const latestByChannel = new Map<string, string>();
  return {
    kind,
    async request(operation, options) {
      const channel = options?.channel ?? "default";
      const taskId = nextTaskId();
      latestByChannel.set(channel, taskId);
      const request: EngineRequest = { protocolVersion: PROTOCOL_VERSION, taskId, operation };
      const response = parseResponse(await transport(JSON.stringify(request)));
      if (response.taskId !== taskId) {
        throw new ProtocolError(`Response task id ${response.taskId} does not match ${taskId}`);
      }
      if (latestByChannel.get(channel) !== taskId) {
        throw new StaleResponseError(taskId);
      }
      return response;
    },
    dispose,
  };
}
