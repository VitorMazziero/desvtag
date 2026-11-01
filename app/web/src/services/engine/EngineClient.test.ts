import { describe, expect, it } from "vitest";
import { type EngineRequest, type EngineResponse, PROTOCOL_VERSION } from "./contracts.generated";
import {
  createEngineClient,
  ProtocolError,
  parseResponse,
  StaleResponseError,
} from "./EngineClient";

function okInfo(taskId: string): EngineResponse {
  return {
    protocolVersion: PROTOCOL_VERSION,
    taskId,
    outcome: {
      status: "ok",
      result: {
        type: "engineInfo",
        engineVersion: "0.1.0",
        protocolVersion: PROTOCOL_VERSION,
        projectSchemaVersion: 1,
        capabilities: { methods: [] },
      },
    },
  };
}

/** Transporte simulado: responde com o mesmo taskId, após um atraso controlável. */
function fakeTransport(delays: number[] = []) {
  let call = 0;
  return async (json: string) => {
    const request = JSON.parse(json) as EngineRequest;
    const delay = delays[call++] ?? 0;
    await new Promise((r) => setTimeout(r, delay));
    return JSON.stringify(okInfo(request.taskId));
  };
}

describe("EngineClient", () => {
  it("sends the protocol version and returns the typed response", async () => {
    const client = createEngineClient("wasm", fakeTransport());
    const response = await client.request({ type: "engineInfo" });
    expect(response.outcome.status).toBe("ok");
  });

  it("discards an older response when a newer request used the same channel", async () => {
    const client = createEngineClient("wasm", fakeTransport([30, 0]));
    const first = client.request({ type: "engineInfo" }, { channel: "a" });
    const second = client.request({ type: "engineInfo" }, { channel: "a" });
    await expect(first).rejects.toBeInstanceOf(StaleResponseError);
    await expect(second).resolves.toBeDefined();
  });

  it("does not discard responses from different channels", async () => {
    const client = createEngineClient("wasm", fakeTransport([30, 0]));
    const first = client.request({ type: "engineInfo" }, { channel: "a" });
    const second = client.request({ type: "engineInfo" }, { channel: "b" });
    await expect(first).resolves.toBeDefined();
    await expect(second).resolves.toBeDefined();
  });

  it("rejects a response with a different task id", async () => {
    const client = createEngineClient("tauri", async () => JSON.stringify(okInfo("other")));
    await expect(client.request({ type: "engineInfo" })).rejects.toBeInstanceOf(ProtocolError);
  });
});

describe("parseResponse", () => {
  it("rejects invalid JSON and wrong shapes", () => {
    expect(() => parseResponse("{")).toThrow(ProtocolError);
    expect(() => parseResponse("[]")).toThrow(ProtocolError);
    expect(() => parseResponse('{"protocolVersion":1,"outcome":{"status":"maybe"}}')).toThrow(
      ProtocolError,
    );
  });

  it("accepts a coded engine error", () => {
    const text = JSON.stringify({
      protocolVersion: 1,
      taskId: null,
      outcome: { status: "error", error: { code: "invalidRequest", params: {} } },
    });
    expect(parseResponse(text).outcome.status).toBe("error");
  });
});
