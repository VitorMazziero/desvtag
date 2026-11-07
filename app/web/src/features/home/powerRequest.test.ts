import { expect, it } from "vitest";
import type { PowerSelection } from "../../services/engine";
import { savedPowerSignature } from "../analysis/familySignatures";
import { defaultPowerAdvanced } from "./powerDesignInput";
import { buildPowerRequest } from "./powerRequest";
import { powerSignature, validatePower } from "./powerValidation";

const base: PowerSelection = {
  kind: "twoSampleT",
  goal: "powerAt",
  means: "10;12;14;12",
  difference: "1",
  sigma: "1,2",
  alpha: "0,05",
  target: "0,8",
  n: "5",
  halfWidth: "0,5",
  twoSided: true,
};
it("maps decimal-comma predictors and slopes without computing scientific output", () => {
  const selection = {
    ...base,
    kind: "regression" as const,
    advanced: { ...defaultPowerAdvanced, coefficients: "0,45;-0,25" },
  };
  expect(validatePower(selection)).toEqual({});
  const request = buildPowerRequest(selection);
  expect(request?.design).toEqual({
    type: "regression",
    predictors: [
      [-2, 1],
      [-1, 0],
      [0, 1],
      [1, 0],
      [2, 2],
    ],
    coefficients: [0.45, -0.25],
  });
  expect(request?.sigma).toBe(1.2);
  expect(request?.goal).toEqual({ type: "powerAt", n: 5 });
});
it("maps planned contrast and one-based factorial term labels to their typed contracts", () => {
  expect(
    buildPowerRequest({
      ...base,
      kind: "contrast",
      means: "10;11,2;12",
      advanced: { ...defaultPowerAdvanced, weights: "-2;1;1", allocation: "1;2;1" },
    })?.design,
  ).toEqual({
    type: "contrast",
    means: [10, 11.2, 12],
    weights: [-2, 1, 1],
    allocation: [1, 2, 1],
  });
  expect(
    buildPowerRequest({ ...base, kind: "twoLevel", advanced: defaultPowerAdvanced })?.design,
  ).toEqual({
    type: "twoLevel",
    factors: 3,
    terms: [[0], [1], [2], [0, 1]],
    effects: [0.8, 0.5, 0.2, 0.9],
    target: 3,
  });
});
it("blocks malformed design/simulation fields and retains their individual errors", () => {
  const bad = {
    ...base,
    kind: "regression" as const,
    advanced: { ...defaultPowerAdvanced, predictors: "1;2\n3", coefficients: "x" },
    simulation: { seed: "-1", replications: "999" },
  };
  expect(validatePower(bad)).toMatchObject({
    predictors: "power.invalid_regression",
    coefficients: "power.invalid_regression",
    simulationSeed: "power.invalid_seed",
    simulationReplications: "power.invalid_simulation",
  });
  expect(buildPowerRequest(bad)).toBeNull();
  expect(
    validatePower({
      ...base,
      kind: "twoLevel",
      advanced: { ...defaultPowerAdvanced, terms: "1;2;2" },
    }).terms,
  ).toBe("power.invalid_two_level");
});
it("permits null calibration and n=1 only when the selected design supports that replication unit", () => {
  expect(validatePower({ ...base, difference: "0" })).toEqual({});
  expect(validatePower({ ...base, n: "1" }).n).toBe("power.invalid_n");
  expect(
    validatePower({ ...base, kind: "regression", n: "1", advanced: defaultPowerAdvanced }),
  ).toEqual({});
  expect(
    validatePower({
      ...base,
      kind: "regression",
      goal: "precisionFor",
      advanced: defaultPowerAdvanced,
    }).halfWidth,
  ).toBe("power.precision_needs_t");
});
it("signatures include active design and seed while ignoring hidden draft assumptions", () => {
  const unchanged = {
    ...base,
    advanced: { ...defaultPowerAdvanced, predictors: "invalid hidden draft" },
  };
  expect(powerSignature(base, true)).toBe(powerSignature(unchanged, true));
  expect(savedPowerSignature(base)).toBe(savedPowerSignature(unchanged));
  const regression = { ...base, kind: "regression" as const, advanced: defaultPowerAdvanced };
  expect(savedPowerSignature(regression)).toMatch(/^power:v2:/);
  expect(
    savedPowerSignature({
      ...regression,
      advanced: { ...defaultPowerAdvanced, weights: "irrelevant" },
    }),
  ).toBe(savedPowerSignature(regression));
  expect(
    savedPowerSignature({ ...regression, simulation: { seed: "1", replications: "1000" } }),
  ).not.toBe(savedPowerSignature(regression));
});
