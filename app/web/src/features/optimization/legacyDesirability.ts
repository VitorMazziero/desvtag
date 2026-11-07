import type { Goal } from "../../services/engine";

/** Detect intervals whose width overflowed in the original desirability formula. */
export function hasOverflowingDesirabilitySpan(goal: Goal): boolean {
  switch (goal.type) {
    case "maximize":
      return !Number.isFinite(goal.target - goal.low);
    case "minimize":
      return !Number.isFinite(goal.high - goal.target);
    case "target":
      return !Number.isFinite(goal.target - goal.low) || !Number.isFinite(goal.high - goal.target);
    case "range":
      return false;
  }
}
