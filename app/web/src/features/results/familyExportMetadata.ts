import type {
  MixtureRecord,
  NonlinearRecord,
  PowerRecord,
  RepeatedRecord,
} from "../../services/engine";

/** Preserve undefined states alongside blank numeric cells; no scientific calculation. */
export function familyExportMetadata(
  record: MixtureRecord | NonlinearRecord | PowerRecord | RepeatedRecord,
) {
  const undefinedStates: Record<string, string> = {};
  function visit(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    if ("status" in value && value.status === "undefined" && "reason" in value) {
      undefinedStates[path] = String(value.reason);
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key);
  }
  visit(record.result, "");
  const provenance = record.result.provenance;
  return {
    app: "DesvTAG",
    method: `${provenance.methodId} v${provenance.methodVersion}`,
    engine: provenance.engineVersion,
    ...("simulation" in record.result && record.result.simulation
      ? { simulationAlgorithm: record.result.simulation.algorithm }
      : {}),
    analysis: record.id,
    revision: record.revisionId,
    signature: record.signature,
    configuration: JSON.stringify(record.input),
    undefinedStates: JSON.stringify(undefinedStates),
  };
}
