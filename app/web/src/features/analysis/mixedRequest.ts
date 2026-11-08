// Parse raw input and map explicit occasion labels; scientific work stays in Rust.
import type { TFunction } from "i18next";
import type { AdvancedMixedSpec, MixedAdvancedSelection } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { parseNumberCell } from "../data";

export function mixedAdvancedRequest(
  state: ProjectState,
  options: MixedAdvancedSelection,
  t: TFunction,
): { request?: AdvancedMixedSpec; problems: string[] } {
  const problems: string[] = [];
  const index = state.factors.findIndex((f) => f.id === options.timeSource);
  if (options.timeSource && index < 0) return { problems: [t("mixedAdvanced.invalidSource")] };
  const order = options.occasionOrder
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
  if (order.length !== new Set(order).size)
    return { problems: [t("mixedAdvanced.duplicateOrder")] };
  const labels = new Map(order.map((name, i) => [name, i]));
  const times = options.timeEnabled
    ? state.rows.map((row, i) => {
        const raw = (index < 0 ? row.timeText : row.factors[index])?.trim() ?? "";
        if (!raw) return null;
        if (order.length) {
          const value = labels.get(raw);
          if (value === undefined) {
            problems.push(t("mixedAdvanced.unknownOccasion", { row: i + 1, value: raw }));
            return null;
          }
          return value;
        }
        const parsed = parseNumberCell(raw);
        if (!parsed.ok) {
          problems.push(t("mixedAdvanced.invalidTime", { row: i + 1, value: raw }));
          return null;
        }
        return parsed.value;
      })
    : undefined;
  const references = options.references.flatMap((reference) => {
    if (!reference.value.trim()) return [];
    const parsed = parseNumberCell(reference.value);
    if (!parsed.ok || parsed.value === null) {
      problems.push(
        t("mixedAdvanced.invalidReference", {
          name: state.factors.find((f) => f.id === reference.factorId)?.name ?? reference.factorId,
        }),
      );
      return [];
    }
    return [{ factorId: reference.factorId, value: parsed.value }];
  });
  if (problems.length) return { problems };
  return {
    problems,
    request: {
      covariance: options.covariance,
      times,
      timeLabels: order.map((label, index) => ({ label, index })),
      timeEffect: options.timeEffect,
      marginalFactors: options.marginalFactors,
      marginalTime: options.marginalTime,
      adjustment: options.adjustment,
      references,
    },
  };
}
