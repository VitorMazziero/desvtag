import { expect, it } from "vitest";
import type { NonlinearSelection } from "../../services/engine";
import { nonlinearParameterLabels, parseNonlinearOptions } from "./parseNonlinearOptions";

const base: NonlinearSelection = { factorId: "x", responseId: "y", model: "monod" };
it("preserves automatic defaults and parses decimal commas and explicit bounds", () => {
  expect(parseNonlinearOptions(base)).toEqual({
    errors: {},
    initial: null,
    lower: null,
    upper: null,
  });
  expect(
    parseNonlinearOptions({
      ...base,
      initial: ["3,2", "2e-1"],
      lower: ["0,01", ""],
      upper: ["4", "1"],
      profile: true,
    }),
  ).toEqual({ errors: {}, initial: [3.2, 0.2], lower: [0.01, null], upper: [4, 1], profile: true });
});
it("invalid starts and reversed bounds identify their own fields before dispatch", () => {
  expect(
    parseNonlinearOptions({ ...base, initial: ["", "NaN"], lower: ["2", "-1"], upper: ["1", ""] })
      .errors,
  ).toEqual({
    "initial-0": "positive",
    "initial-1": "positive",
    "lower-1": "positive",
    "upper-0": "bounds",
  });
  expect(parseNonlinearOptions({ ...base, initial: ["9", "1"], upper: ["4", ""] }).errors).toEqual({
    "initial-0": "inside",
  });
});

it("keeps physical parameter units distinct from the dimensionless Hill exponent", () => {
  expect(nonlinearParameterLabels("hill", "g/L", "U/mL")).toEqual(["Vmax [U/mL]", "K [g/L]", "n"]);
  expect(nonlinearParameterLabels("haldane", "g/L", "h⁻¹")).toEqual([
    "μmax [h⁻¹]",
    "Ks [g/L]",
    "Ki [g/L]",
  ]);
});
