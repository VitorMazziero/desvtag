// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it } from "vitest";
import {
  type EngineResponse,
  type PowerRequest,
  type PowerResult,
  PROTOCOL_VERSION,
} from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

beforeAll(() =>
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) }),
);
it("all ten analytical and Monte Carlo results match native Rust including exact rejection counts", () => {
  const directory = resolve(
    __dirname,
    "../../../../../validation/cases/power_advanced/native_parity",
  );
  for (const file of readdirSync(directory).filter((f) => f.endsWith(".json"))) {
    const native = JSON.parse(readFileSync(resolve(directory, file), "utf8")) as {
      request: PowerRequest;
      result: PowerResult;
    };
    const response = JSON.parse(
      handleRequest(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          taskId: file,
          operation: { type: "powerAnalyze", ...native.request },
        }),
      ),
    ) as EngineResponse;
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "powerAnalyze")
      throw new Error(JSON.stringify(response));
    const result = response.outcome.result;
    expect(result.n, file).toBe(native.result.n);
    expect(result.total, file).toBe(native.result.total);
    expect(result.provenance.methodVersion).toBe(2);
    if (result.power.status === "defined" && native.result.power.status === "defined")
      expect(result.power.value).toBeCloseTo(native.result.power.value, 10);
    else throw new Error("undefined power");
    expect(result.simulation?.rejections, file).toBe(native.result.simulation?.rejections);
    expect(result.simulation?.algorithm).toBe(native.result.simulation?.algorithm);
    expect(result.simulation?.seed).toBe(native.result.simulation?.seed);
    expect(result.simulation?.standardError).toBeCloseTo(
      native.result.simulation?.standardError ?? 0,
      12,
    );
    expect(result.simulation?.ciLower).toBeCloseTo(native.result.simulation?.ciLower ?? 0, 12);
    expect(result.simulation?.ciUpper).toBeCloseTo(native.result.simulation?.ciUpper ?? 0, 12);
  }
});

it("equivalent response scales preserve advanced power in the real WASM engine", () => {
  const directory = resolve(
    __dirname,
    "../../../../../validation/cases/power_advanced/native_parity",
  );
  for (const file of readdirSync(directory).filter((f) => f.endsWith(".json"))) {
    const native = JSON.parse(readFileSync(resolve(directory, file), "utf8"));
    for (const scale of [1e-160, 1e160]) {
      const request = structuredClone(native.request) as PowerRequest;
      request.sigma *= scale;
      if (request.design.type === "contrast")
        request.design.means = request.design.means.map((v) => v * scale);
      else if (request.design.type === "regression")
        request.design.coefficients = request.design.coefficients.map((v) => v * scale);
      else if (request.design.type === "twoLevel")
        request.design.effects = request.design.effects.map((v) => v * scale);
      else throw new Error("unexpected fixture design");
      if (request.goal.type === "precisionFor") request.goal.halfWidth *= scale;
      const response = JSON.parse(
        handleRequest(
          JSON.stringify({
            protocolVersion: PROTOCOL_VERSION,
            taskId: `${file}-${scale}`,
            operation: { type: "powerAnalyze", ...request },
          }),
        ),
      ) as EngineResponse;
      if (response.outcome.status !== "ok" || response.outcome.result.type !== "powerAnalyze")
        throw new Error(JSON.stringify(response));
      const result = response.outcome.result;
      expect(result.n, `${file}/${scale}`).toBe(native.result.n);
      if (result.power.status !== "defined") throw new Error("undefined power");
      expect(result.power.value).toBeCloseTo(native.result.power.value, 9);
      expect(result.simulation?.rejections).toBe(native.result.simulation.rejections);
    }
  }
});
