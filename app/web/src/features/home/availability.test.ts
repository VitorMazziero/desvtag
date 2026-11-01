import { describe, expect, it } from "vitest";
import { missingMethods } from "./availability";

const caps = (...ids: string[]) => ({
  methods: ids.map((id) => ({
    id,
    version: 1,
    implementation: "implemented" as const,
    validation: "notValidated" as const,
  })),
});

describe("missingMethods", () => {
  it("reports what the engine registry does not have yet", () => {
    const c = caps("descriptive_summary");
    expect(missingMethods("analyze", c)).toEqual([]);
    expect(missingMethods("plan", c)).toEqual(["plackett_burman_design"]);
    expect(missingMethods("compare", c)).toEqual(["one_way_comparison"]);
  });
  it("lights up automatically when a future stage registers the method", () => {
    expect(missingMethods("compare", caps("descriptive_summary", "one_way_comparison"))).toEqual(
      [],
    );
  });
  it("treats unknown capabilities as everything missing", () => {
    expect(missingMethods("analyze", null)).toEqual(["descriptive_summary"]);
  });
});
