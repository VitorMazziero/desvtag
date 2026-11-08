// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEngineClient, StaleResponseError } from "./EngineClient";
import { isServiceRequest, queuedTransport } from "./taskQueue";

const response = (json: string) => {
  const request = JSON.parse(json);
  return JSON.stringify({
    protocolVersion: 1,
    taskId: request.taskId,
    outcome: { status: "ok", result: { type: "engineInfo" } },
  });
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("bounded native-style queue", () => {
  it("keeps the CPU slot after cancel, removes queued replacements and preserves independent service work", async () => {
    let finish: () => void = () => {};
    let active = 0,
      peak = 0,
      starts = 0;
    const compute = queuedTransport(
      (json) =>
        new Promise<string>((resolve) => {
          active++;
          peak = Math.max(peak, active);
          starts++;
          finish = () => {
            active--;
            resolve(response(json));
          };
        }),
    );
    const service = queuedTransport(async (json) => response(json));
    const client = createEngineClient("tauri", (json, signal) =>
      (isServiceRequest(json) ? service : compute)(json, signal),
    );
    const run = () => client.request({ type: "powerAnalyze" } as never, { channel: "power" });
    const first = run();
    await flush();
    client.cancel("power");
    await expect(first).rejects.toBeInstanceOf(StaleResponseError);
    for (let i = 0; i < 20; i++) {
      const queued = run();
      client.cancel("power");
      await expect(queued).rejects.toBeInstanceOf(StaleResponseError);
    }
    const last = run();
    await expect(
      client.request({ type: "engineInfo" }, { channel: "file" }),
    ).resolves.toBeDefined();
    expect(starts).toBe(1);
    finish();
    await flush();
    await flush();
    expect(starts).toBe(2);
    finish();
    await expect(last).resolves.toBeDefined();
    expect(peak).toBe(1);
    client.dispose();
  });
  it("bounds pending requests and never starts an aborted pending request", async () => {
    const queue = queuedTransport(() => new Promise(() => {}), 2);
    const active = new AbortController();
    const a = queue("a", active.signal).catch((e) => e);
    const pending = new AbortController();
    const b = queue("b", pending.signal).catch((e) => e);
    const c = queue("c", new AbortController().signal).catch((e) => e);
    await expect(queue("d", new AbortController().signal)).rejects.toThrow("queue full");
    active.abort();
    pending.abort();
    expect(await a).toBeInstanceOf(Error);
    expect(await b).toBeInstanceOf(Error);
    void c;
  });
});
