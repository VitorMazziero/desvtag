import type { PowerRequest, PowerSelection } from "../../services/engine";
import { defaultPowerAdvanced, isAdvancedPower, parsePowerDesign } from "./powerDesignInput";
import { parseInput, parseMeans, validatePower } from "./powerValidation";
/** Map validated raw fields to a scientific request. No power/df/variance is computed here. */
export function buildPowerRequest(selection: PowerSelection): PowerRequest | null {
  if (Object.keys(validatePower(selection)).length) return null;
  const { kind, goal } = selection;
  const design = isAdvancedPower(kind)
    ? parsePowerDesign(kind, selection.advanced ?? defaultPowerAdvanced, selection.means).design
    : kind === "anova"
      ? { type: "anova" as const, means: parseMeans(selection.means) }
      : {
          type: kind as "oneSampleT" | "pairedT" | "twoSampleT",
          difference: goal === "precisionFor" ? 0 : parseInput(selection.difference),
        };
  if (!design) return null;
  return {
    design,
    sigma: parseInput(selection.sigma),
    alpha: parseInput(selection.alpha),
    twoSided: selection.twoSided,
    goal:
      goal === "powerAt"
        ? { type: "powerAt", n: parseInput(selection.n) }
        : goal === "sampleSizeFor"
          ? { type: "sampleSizeFor", power: parseInput(selection.target) }
          : { type: "precisionFor", halfWidth: parseInput(selection.halfWidth) },
    ...(selection.simulation
      ? {
          simulation: {
            seed: parseInput(selection.simulation.seed),
            replications: parseInput(selection.simulation.replications),
          },
        }
      : {}),
  };
}
