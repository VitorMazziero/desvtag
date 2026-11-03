import { describe, expect, it } from "vitest";
import { type PowerInputs, parseInput, powerSignature, validatePower } from "./powerValidation";

const valid: PowerInputs = {
  kind: "twoSampleT",
  goal: "sampleSizeFor",
  means: "10; 12; 14; 12",
  difference: "1",
  sigma: "1,5",
  alpha: "0.05",
  target: "0.8",
  n: "10",
  halfWidth: "0.5",
};

describe("validatePower", () => {
  it("accepts the default inputs", () => {
    expect(validatePower(valid)).toEqual({});
  });
  it("rejects alpha = 2 and empty fields with the engine codes (UX44)", () => {
    expect(validatePower({ ...valid, alpha: "2" }).alpha).toBe("power.invalid_alpha");
    expect(validatePower({ ...valid, sigma: "" }).sigma).toBe("power.invalid_sigma");
    expect(validatePower({ ...valid, sigma: "0" }).sigma).toBe("power.invalid_sigma");
    expect(validatePower({ ...valid, target: "1" }).target).toBe("power.invalid_target");
  });
  it("only checks the fields of the chosen design and goal", () => {
    expect(validatePower({ ...valid, means: "x", n: "x", halfWidth: "" })).toEqual({});
    expect(validatePower({ ...valid, goal: "precisionFor", difference: "" })).toEqual({});
    expect(validatePower({ ...valid, goal: "precisionFor", halfWidth: "0" }).halfWidth).toBe(
      "power.invalid_half_width",
    );
    expect(validatePower({ ...valid, goal: "powerAt", n: "1" }).n).toBe("power.invalid_n");
    expect(validatePower({ ...valid, goal: "powerAt", n: "2,5" }).n).toBe("power.invalid_n");
  });
  it("flags a zero difference and equal ANOVA means as no effect", () => {
    expect(validatePower({ ...valid, difference: "0" }).difference).toBe("power.no_effect");
    expect(validatePower({ ...valid, kind: "anova", means: "5; 5; 5" }).means).toBe(
      "power.no_effect",
    );
    expect(validatePower({ ...valid, kind: "anova", means: "5" }).means).toBe(
      "power.invalid_means",
    );
  });
});

describe("parseInput / powerSignature", () => {
  it("never turns an empty text into zero", () => {
    expect(parseInput("")).toBeNaN();
    expect(parseInput(" 1,5 ")).toBe(1.5);
  });
  it("changes with a visible input and ignores hidden ones", () => {
    const base = powerSignature(valid, true);
    expect(powerSignature({ ...valid, alpha: "0.1" }, true)).not.toBe(base);
    expect(powerSignature(valid, false)).not.toBe(base);
    expect(powerSignature({ ...valid, n: "99", halfWidth: "9" }, true)).toBe(base);
  });
});
