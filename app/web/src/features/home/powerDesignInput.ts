import type { PowerAdvancedSelection, PowerDesign, PowerKind } from "../../services/engine";
import { parseInput, parseMeans } from "./powerParsing";
export const defaultPowerAdvanced: PowerAdvancedSelection = {
  predictors: "-2;1\n-1;0\n0;1\n1;0\n2;2",
  coefficients: "0.45;-0.25",
  weights: "-3;1;1;1",
  allocation: "1;1;1;1",
  factorCount: "3",
  terms: "1;2;3;1*2",
  effects: "0.8;0.5;0.2;0.9",
  targetTerm: "3",
};
export type AdvancedPowerField =
  | "predictors"
  | "coefficients"
  | "weights"
  | "allocation"
  | "factorCount"
  | "terms"
  | "effects"
  | "targetTerm";
export const isAdvancedPower = (kind: PowerKind) =>
  kind === "regression" || kind === "contrast" || kind === "twoLevel";
export function parsePowerTerms(text: string): number[][] {
  return text.trim()
    ? text
        .split(/[;\n]+/)
        .filter((p) => p.trim())
        .map((term) =>
          term
            .trim()
            .split(/\s*[*×x]\s*/)
            .map((v) => parseInput(v) - 1),
        )
    : [];
}
/** Shape, identifiers and number parsing only; rank/contrast constraints are checked by Rust. */
export function parsePowerDesign(
  kind: PowerKind,
  raw: PowerAdvancedSelection,
  meansText: string,
): { design?: PowerDesign; errors: Partial<Record<AdvancedPowerField, string>> } {
  const errors: Partial<Record<AdvancedPowerField, string>> = {};
  let design: PowerDesign | undefined;
  if (kind === "regression") {
    const predictors = raw.predictors
      .split(/\r?\n/)
      .filter((r) => r.trim())
      .map((row) => row.split(/[;\t]/).map(parseInput));
    const k = predictors[0]?.length ?? 0;
    const coefficients = parseMeans(raw.coefficients);
    if (
      k < 1 ||
      k > 32 ||
      predictors.length < k + 1 ||
      predictors.length > 4096 ||
      predictors.some((r) => r.length !== k || r.some((v) => !Number.isFinite(v)))
    )
      errors.predictors = "power.invalid_regression";
    if (coefficients.length !== k || coefficients.some((v) => !Number.isFinite(v)))
      errors.coefficients = "power.invalid_regression";
    design = { type: "regression", predictors, coefficients };
  } else if (kind === "contrast") {
    const means = parseMeans(meansText),
      weights = parseMeans(raw.weights),
      allocation = parseMeans(raw.allocation);
    if (
      weights.length !== means.length ||
      weights.some((v) => !Number.isFinite(v)) ||
      weights.every((v) => v === 0)
    )
      errors.weights = "power.invalid_contrast";
    if (allocation.length !== means.length || allocation.some((v) => !Number.isInteger(v) || v < 1))
      errors.allocation = "power.invalid_contrast";
    design = { type: "contrast", means, weights, allocation };
  } else if (kind === "twoLevel") {
    const factors = parseInput(raw.factorCount),
      terms = parsePowerTerms(raw.terms),
      effects = parseMeans(raw.effects),
      target = parseInput(raw.targetTerm);
    if (!Number.isInteger(factors) || factors < 1 || factors > 8)
      errors.factorCount = "power.invalid_two_level";
    const keys = terms.map((term) => [...term].sort((a, b) => a - b).join("*"));
    if (
      !terms.length ||
      new Set(keys).size !== terms.length ||
      terms.some(
        (term) =>
          !term.length ||
          new Set(term).size !== term.length ||
          term.some((v) => !Number.isInteger(v) || v < 0 || v >= factors),
      )
    )
      errors.terms = "power.invalid_two_level";
    if (effects.length !== terms.length || effects.some((v) => !Number.isFinite(v)))
      errors.effects = "power.invalid_two_level";
    if (!Number.isInteger(target) || target < 0 || target >= terms.length)
      errors.targetTerm = "power.invalid_two_level";
    design = { type: "twoLevel", factors, terms, effects, target };
  }
  return { design: Object.keys(errors).length ? undefined : design, errors };
}
export function activePowerAssumptions(
  kind: PowerKind,
  raw: PowerAdvancedSelection,
  means: string,
) {
  if (kind === "regression") return [raw.predictors.trim(), raw.coefficients.trim()];
  if (kind === "contrast") return [means.trim(), raw.weights.trim(), raw.allocation.trim()];
  if (kind === "twoLevel")
    return [raw.factorCount.trim(), raw.terms.trim(), raw.effects.trim(), raw.targetTerm.trim()];
  return [];
}
