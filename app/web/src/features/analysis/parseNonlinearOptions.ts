import type { NonlinearSelection } from "../../services/engine";
import { parseNumberCell } from "../data/editing";
export const saturationParameters = {
  monod: ["Vmax / μmax", "Km / Ks"],
  haldane: ["μmax", "Ks", "Ki"],
  hill: ["Vmax", "K", "n"],
};
/** Parsing and field validation only; estimation and inference remain in Rust. */
export function parseNonlinearOptions(selection: NonlinearSelection) {
  const count = saturationParameters[selection.model].length;
  const errors: Record<string, string> = {};
  const parse = (kind: "initial" | "lower" | "upper") => {
    const fields = selection[kind];
    if (!fields) return null;
    return Array.from({ length: count }, (_, i) => {
      const raw = fields[i] ?? "";
      const parsed = parseNumberCell(raw);
      if (
        !parsed.ok ||
        (kind === "initial" && parsed.value === null) ||
        (parsed.value !== null && parsed.value <= 0)
      ) {
        errors[`${kind}-${i}`] = "positive";
        return null;
      }
      return parsed.value;
    });
  };
  const initial = parse("initial"),
    lower = parse("lower"),
    upper = parse("upper");
  for (let i = 0; i < count; i++) {
    const lo = lower?.[i] ?? 1e-12,
      hi = upper?.[i] ?? Infinity,
      start = initial?.[i];
    if (hi <= lo) errors[`upper-${i}`] = "bounds";
    if (start !== null && start !== undefined && (start < lo || start > hi))
      errors[`initial-${i}`] = "inside";
  }
  return {
    errors,
    initial: initial as number[] | null,
    lower,
    upper,
    ...(selection.profile ? { profile: true } : {}),
  };
}

export function nonlinearParameterLabels(
  model: NonlinearSelection["model"],
  substrateUnit: string,
  responseUnit: string,
) {
  return saturationParameters[model].map((name, i) => {
    const unit = i === 0 ? responseUnit : model === "hill" && i === 2 ? "" : substrateUnit;
    return unit ? `${name} [${unit}]` : name;
  });
}
