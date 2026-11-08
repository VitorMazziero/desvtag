// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, expect, it } from "vitest";
import type { EngineResponse, NonlinearRequest } from "./contracts.generated";
import { PROTOCOL_VERSION } from "./contracts.generated";
import { handleRequest, initSync } from "./wasm/desvtag_wasm.js";

beforeAll(() =>
  initSync({ module: readFileSync(resolve(__dirname, "wasm/desvtag_wasm_bg.wasm")) }),
);
it("all four independent likelihood profiles agree through actual WASM", () => {
  const cases = JSON.parse(
    readFileSync(
      resolve(__dirname, "../../../../../validation/cases/nonlinear_profile/profile.json"),
      "utf8",
    ),
  ).cases as { request: NonlinearRequest; expected: { sse: number; intervals: number[][] } }[];
  for (const c of cases) {
    const response = JSON.parse(
      handleRequest(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          taskId: "profile-parity",
          operation: { type: "modelNonlinear", ...c.request },
        }),
      ),
    ) as EngineResponse;
    if (response.outcome.status !== "ok" || response.outcome.result.type !== "modelNonlinear")
      throw new Error(JSON.stringify(response));
    const result = response.outcome.result;
    expect(result.provenance.methodVersion).toBe(2);
    expect(result.sse).toBeCloseTo(c.expected.sse, 7);
    expect(result.profiles).toHaveLength(c.expected.intervals.length);
    result.profiles?.forEach((p, i) => {
      expect(p.unimodalInExaminedRange).toBe(true);
      expect(p.lowerStatus).toBe("crossing");
      expect(p.upperStatus).toBe("crossing");
      expect(p.lower.status).toBe("defined");
      expect(p.upper.status).toBe("defined");
      if (p.lower.status === "defined" && p.upper.status === "defined") {
        expect(p.lower.value).toBeCloseTo(c.expected.intervals[i]![0]!, 2);
        expect(p.upper.value).toBeCloseTo(c.expected.intervals[i]![1]!, 2);
      }
    });
  }
});
