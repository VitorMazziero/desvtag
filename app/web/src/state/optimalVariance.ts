// Structural identity of a geometric calculation; no statistical computation here.
import type { GeneratedOptimal, OptimalVariance, OptimalVarianceRequest } from "../services/engine";

export function optimalVarianceInput(design: GeneratedOptimal): OptimalVarianceRequest {
  return {
    spec: design.spec,
    runsReal: design.runs.map((run) => run.real),
    ...(design.spec.categories
      ? { runCategories: design.runs.map((run) => run.categories ?? []) }
      : {}),
    ...(design.spec.blocks ? { runBlocks: design.runs.map((run) => run.block ?? -1) } : {}),
  };
}

export function optimalVarianceKey(input: OptimalVarianceRequest): string {
  return JSON.stringify(input, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  );
}

export function matchesOptimalVariance(
  design: GeneratedOptimal,
  profile: OptimalVariance,
): boolean {
  return optimalVarianceKey(optimalVarianceInput(design)) === optimalVarianceKey(profile.request);
}
