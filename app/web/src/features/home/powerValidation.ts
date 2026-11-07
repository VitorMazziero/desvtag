// Conferência dos campos da calculadora de potência ANTES de chamar o motor (UX44): o motor valida
// do mesmo jeito, mas o usuário vê o problema junto do campo e não um erro genérico. Os códigos são
// os do motor (`power.*`), com texto em `diagnostics`.
import type {
  PowerAdvancedSelection,
  PowerKind,
  PowerSimulationSelection,
} from "../../services/engine";
import {
  type AdvancedPowerField,
  activePowerAssumptions,
  defaultPowerAdvanced,
  isAdvancedPower,
  parsePowerDesign,
} from "./powerDesignInput";
import { parseInput, parseMeans } from "./powerParsing";

export type { PowerKind } from "../../services/engine";
export { parseInput, parseMeans } from "./powerParsing";
export type PowerGoalKind = "sampleSizeFor" | "powerAt" | "precisionFor";

export type PowerField =
  | "means"
  | "difference"
  | "sigma"
  | "alpha"
  | "target"
  | "n"
  | "halfWidth"
  | AdvancedPowerField
  | "simulationSeed"
  | "simulationReplications";

export interface PowerInputs {
  kind: PowerKind;
  goal: PowerGoalKind;
  means: string;
  difference: string;
  sigma: string;
  alpha: string;
  target: string;
  n: string;
  halfWidth: string;
  advanced?: PowerAdvancedSelection;
  simulation?: PowerSimulationSelection;
}

const between01 = (v: number) => Number.isFinite(v) && v > 0 && v < 1;

/** Problemas por campo (código `power.*` do motor); vazio quando os campos estão válidos. */
export function validatePower(input: PowerInputs): Partial<Record<PowerField, string>> {
  const problems: Partial<Record<PowerField, string>> = {};
  const sigma = parseInput(input.sigma);
  if (!(Number.isFinite(sigma) && sigma > 0)) problems.sigma = "power.invalid_sigma";
  if (!between01(parseInput(input.alpha))) problems.alpha = "power.invalid_alpha";

  const precision = input.goal === "precisionFor";
  if (input.kind === "anova" || input.kind === "contrast") {
    const means = parseMeans(input.means);
    if (means.length < 2 || means.some((m) => !Number.isFinite(m)))
      problems.means = "power.invalid_means";
    else if (
      input.kind === "anova" &&
      input.goal !== "powerAt" &&
      means.every((m) => m === means[0])
    )
      problems.means = "power.no_effect";
  } else if (!isAdvancedPower(input.kind) && !precision) {
    const difference = parseInput(input.difference);
    if (!Number.isFinite(difference)) problems.difference = "power.invalid_difference";
    else if (difference === 0 && input.goal !== "powerAt") problems.difference = "power.no_effect";
  }

  if (isAdvancedPower(input.kind))
    Object.assign(
      problems,
      parsePowerDesign(input.kind, input.advanced ?? defaultPowerAdvanced, input.means).errors,
    );
  if (input.goal === "sampleSizeFor" && !between01(parseInput(input.target)))
    problems.target = "power.invalid_target";
  if (input.goal === "powerAt") {
    const n = parseInput(input.n);
    if (
      !(
        Number.isFinite(n) &&
        Number.isInteger(n) &&
        n <= 100000 &&
        n >= (isAdvancedPower(input.kind) ? 1 : 2)
      )
    )
      problems.n = isAdvancedPower(input.kind) ? "power.invalid_replications" : "power.invalid_n";
  }
  if (precision) {
    if (input.kind === "anova" || input.kind === "regression")
      problems.halfWidth = "power.precision_needs_t";
    const half = parseInput(input.halfWidth);
    if (!(Number.isFinite(half) && half > 0)) problems.halfWidth = "power.invalid_half_width";
  }
  if (input.simulation) {
    const seed = parseInput(input.simulation.seed),
      b = parseInput(input.simulation.replications);
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
      problems.simulationSeed = "power.invalid_seed";
    if (!Number.isInteger(b) || b < 1000 || b > 1000000)
      problems.simulationReplications = "power.invalid_simulation";
  }
  return problems;
}

/** Assinatura das entradas que importam para o resultado atual (campos escondidos não contam). */
export function powerSignature(input: PowerInputs, twoSided: boolean): string {
  const base = [input.kind, input.goal, input.sigma.trim(), input.alpha.trim()];
  const kindFields = isAdvancedPower(input.kind)
    ? activePowerAssumptions(input.kind, input.advanced ?? defaultPowerAdvanced, input.means)
    : input.kind === "anova"
      ? [input.means.trim()]
      : [input.difference.trim()];
  const goalFields =
    input.goal === "sampleSizeFor"
      ? [input.target.trim()]
      : input.goal === "powerAt"
        ? [input.n.trim()]
        : [input.halfWidth.trim()];
  return JSON.stringify([
    ...base,
    ...(input.goal === "precisionFor" && !isAdvancedPower(input.kind) ? [] : kindFields),
    ...goalFields,
    twoSided,
    ...(input.simulation
      ? [input.simulation.seed.trim(), input.simulation.replications.trim()]
      : []),
  ]);
}
