// Input identity only. Parsing, fitting, inference and numerical summaries belong to the engine.
import type {
  MixtureSelection,
  NonlinearSelection,
  PowerSelection,
  RepeatedSelection,
} from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { snapshotData } from "../../state/revisionOps";
import { powerSignature } from "../home/powerValidation";
import { unitIdentities } from "./unitIdentities";

export function mixtureSignature(state: ProjectState, selection: MixtureSelection): string {
  const components = state.mixture?.components ?? [];
  const columns = components.map((c) => state.factors.findIndex((f) => f.id === c.id));
  const response = state.responses.findIndex((r) => r.id === selection.responseId);
  const identity = [
    components,
    columns.map((i) => state.factors[i] ?? null),
    state.responses[response] ?? null,
    state.rows.map((r) => [
      r.id,
      columns.map((i) => r.factors[i] ?? ""),
      r.responses[response] ?? "",
    ]),
    state.mixtureModel,
    state.analysis.alpha,
  ];
  if (selection.optimization) {
    const responses = selection.optimization.responses.map((goal) =>
      state.responses.findIndex((response) => response.id === goal.responseId),
    );
    return `mixture:v4:${JSON.stringify([
      ...identity,
      state.mixture?.upperBounds ?? null,
      selection.coxReference ?? null,
      selection.optimization,
      responses.map((index) => state.responses[index] ?? null),
      state.rows.map((row) => responses.map((index) => row.responses[index] ?? "")),
    ])}`;
  }
  if (selection.coxReference)
    return `mixture:v3:${JSON.stringify([...identity, state.mixture?.upperBounds ?? null, selection.coxReference])}`;
  return state.mixture?.upperBounds
    ? `mixture:v2:${JSON.stringify([...identity, state.mixture.upperBounds])}`
    : `mixture:v1:${JSON.stringify(identity)}`;
}

export function nonlinearSignature(state: ProjectState, selection: NonlinearSelection): string {
  const factor = state.factors.findIndex((f) => f.id === selection.factorId);
  const response = state.responses.findIndex((r) => r.id === selection.responseId);
  return `nonlinear:v1:${JSON.stringify([
    state.factors[factor] ?? null,
    state.responses[response] ?? null,
    state.rows.map((r) => [r.id, r.factors[factor] ?? "", r.responses[response] ?? ""]),
    selection,
    state.analysis.alpha,
  ])}`;
}

export function repeatedSignature(state: ProjectState, selection: RepeatedSelection): string {
  // The mixed-model operation receives the full Dataset, including experimental-unit mapping.
  const source = state.factors.findIndex((f) => f.id === selection.unitSource);
  const units = unitIdentities(
    state.rows.map((r) => (source < 0 ? r.unitId : (r.factors[source] ?? ""))),
  );
  // Old ASCII identifiers retain compatibility; lossy mappings from earlier builds are obsolete.
  return `repeated:v${selection.advanced ? 3 : units.remapped ? 2 : 1}:${JSON.stringify([snapshotData(state), selection, state.analysis.alpha])}`;
}

export function savedPowerSignature(selection: PowerSelection): string {
  // Prospective assumptions have no dependence on the experiment's measured observations.
  return `power:v${selection.simulation || ["regression", "contrast", "twoLevel"].includes(selection.kind) ? 2 : 1}:${powerSignature(selection, selection.twoSided)}`;
}
