// @vitest-environment node
import { describe, expect, it } from "vitest";
import { unitIdentities } from "./unitIdentities";

describe("experimental-unit identities", () => {
  it("keeps distinct labels separate when replacing punctuation would have merged them", () => {
    const labels = ["A B", "A+B", "A_B", "unit-1", "日本", "__proto__", "constructor"];
    const mapped = unitIdentities(labels);
    const ids = labels.map((label) => mapped.ids.get(label));
    expect(new Set(ids).size).toBe(labels.length);
    for (const [i, id] of ids.entries()) {
      expect(id).toMatch(/^[A-Za-z0-9_.:-]{1,64}$/);
      expect(mapped.labels[id ?? ""]).toBe(labels[i]);
    }
    expect(mapped.ids.get("A_B")).toBe("A_B");
    expect(mapped.ids.get("unit-1")).toBe("unit-1");
    expect(unitIdentities(labels)).toEqual(mapped);
  });
  it("pairs repeated labels after trimming, preserves original names and ignores empty cells", () => {
    const mapped = unitIdentities([" S1 ", "S1", " S2", "", "  "]);
    expect([...mapped.ids]).toEqual([
      ["S1", "S1"],
      ["S2", "S2"],
    ]);
    expect(mapped.labels).toEqual({ S1: "S1", S2: "S2" });
  });
});
