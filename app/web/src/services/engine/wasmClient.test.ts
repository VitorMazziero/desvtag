// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { StaleResponseError } from "./EngineClient";
import { createWasmClient } from "./wasmClient";

class FakeWorker {
  static instances: FakeWorker[] = [];
  static failPost = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string; preventDefault: () => void }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  ended = false;
  message: { id: number; requestJson: string } | undefined;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: { id: number; requestJson: string }) {
    if (FakeWorker.failPost) {
      FakeWorker.failPost = false;
      throw new Error("posting failed");
    }
    this.message = message;
  }
  terminate() {
    this.ended = true;
  }
  reply() {
    if (!this.message) throw new Error("No request");
    const request = JSON.parse(this.message.requestJson);
    this.onmessage?.({
      data: {
        id: this.message.id,
        ok: true,
        responseJson: JSON.stringify({
          protocolVersion: 1,
          taskId: request.taskId,
          outcome: { status: "ok", result: { type: "engineInfo" } },
        }),
      },
    });
  }
}
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve();
};
afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.instances = [];
  FakeWorker.failPost = false;
});
function setup() {
  vi.stubGlobal("Worker", FakeWorker);
  return createWasmClient();
}
it("cancels only the active calculation while a real service channel remains pending and reusable", async () => {
  const client = setup();
  const compute = client.request({ type: "powerAnalyze" } as never, { channel: "power" });
  const file = client.request({ type: "engineInfo" }, { channel: "save" });
  await flush();
  expect(FakeWorker.instances).toHaveLength(2);
  const [scientific, service] = FakeWorker.instances;
  client.cancel("power");
  await expect(compute).rejects.toBeInstanceOf(StaleResponseError);
  expect(scientific?.ended).toBe(true);
  expect(service?.ended).toBe(false);
  service?.reply();
  await expect(file).resolves.toBeDefined();
  const again = client.request({ type: "powerAnalyze" } as never, { channel: "power" });
  await flush();
  FakeWorker.instances.at(-1)?.reply();
  await expect(again).resolves.toBeDefined();
  client.dispose();
  expect(FakeWorker.instances.every((w) => w.ended)).toBe(true);
});
it("rejects a failed worker task and creates a fresh worker on retry, including synchronous posting failure", async () => {
  const client = setup();
  const failed = client.request({ type: "engineInfo" });
  await flush();
  FakeWorker.instances[0]?.onerror?.({ message: "worker crashed", preventDefault: () => {} });
  await expect(failed).rejects.toThrow("worker crashed");
  FakeWorker.failPost = true;
  await expect(client.request({ type: "engineInfo" })).rejects.toThrow("could not accept");
  const recovered = client.request({ type: "engineInfo" });
  await flush();
  FakeWorker.instances.at(-1)?.reply();
  await expect(recovered).resolves.toBeDefined();
  client.dispose();
});
it("dispose settles active and waiting requests and prevents reuse", async () => {
  const client = setup();
  const first = client.request({ type: "engineInfo" }, { channel: "one" });
  const second = client.request({ type: "engineInfo" }, { channel: "two" });
  await flush();
  client.dispose();
  await expect(first).rejects.toBeInstanceOf(StaleResponseError);
  await expect(second).rejects.toBeInstanceOf(StaleResponseError);
  await expect(client.request({ type: "engineInfo" })).rejects.toThrow("disposed");
});

it("cancelling a queued scientific channel leaves another channel's active worker untouched", async () => {
  const client = setup();
  const first = client.request({ type: "powerAnalyze" } as never, { channel: "power" });
  const pending = client.request({ type: "modelNonlinear" } as never, { channel: "nonlinear" });
  await flush();
  expect(FakeWorker.instances).toHaveLength(1);
  client.cancel("nonlinear");
  await expect(pending).rejects.toBeInstanceOf(StaleResponseError);
  expect(FakeWorker.instances[0]?.ended).toBe(false);
  FakeWorker.instances[0]?.reply();
  await expect(first).resolves.toBeDefined();
  client.dispose();
});
