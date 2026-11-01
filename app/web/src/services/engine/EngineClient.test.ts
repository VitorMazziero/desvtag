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

describe("EngineClient.cancel", () => {
  it("discards the result of a cancelled task and calls the transport abort hook", async () => {
    let aborted = 0;
    const client = createEngineClient("wasm", fakeTransport([30]), undefined, () => {
      aborted += 1;
    });
    const running = client.request({ type: "engineInfo" }, { channel: "search" });
    client.cancel("search");
    await expect(running).rejects.toBeInstanceOf(StaleResponseError);
    expect(aborted).toBe(1);
    // Depois de cancelar, o canal volta a funcionar.
    await expect(
      client.request({ type: "engineInfo" }, { channel: "search" }),
    ).resolves.toBeDefined();
  });

  it("maps a transport failure of a cancelled task to a stale response, but not a real failure", async () => {
    const failing = createEngineClient("wasm", async () => {
      throw new Error("worker terminated");
    });
    await expect(failing.request({ type: "engineInfo" })).rejects.toThrow("worker terminated");
    let rejectNow: (e: Error) => void = () => {};
    const cancellable = createEngineClient(
      "wasm",
      () => new Promise<string>((_, reject) => (rejectNow = reject)),
      undefined,
      () => rejectNow(new Error("worker terminated")),
    );
    const running = cancellable.request({ type: "engineInfo" }, { channel: "x" });
    cancellable.cancel("x");
    await expect(running).rejects.toBeInstanceOf(StaleResponseError);
  });
});
