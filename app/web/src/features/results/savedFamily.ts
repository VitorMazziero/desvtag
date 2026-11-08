import type { TFunction } from "i18next";
import type { AnalysisFamily } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import {
  mixtureSignature,
  nonlinearSignature,
  repeatedSignature,
  savedPowerSignature,
} from "../analysis/familySignatures";

export function savedFamily(state: ProjectState, recordId?: string | null) {
  switch (state.activeFamily) {
    case "mixture": {
      const slot = state.mixtureResult;
      const record = slot?.records.find((r) => r.id === recordId) ?? slot?.records.at(-1);
      return record && slot
        ? {
            family: "mixture" as const,
            record,
            current: record.signature === mixtureSignature(state, slot.selection),
          }
        : null;
    }
    case "repeated": {
      const slot = state.mixedModelResult;
      const record = slot?.records.find((r) => r.id === recordId) ?? slot?.records.at(-1);
      return record && slot
        ? {
            family: "repeated" as const,
            record,
            current: record.signature === repeatedSignature(state, slot.selection),
          }
        : null;
    }
    case "nonlinear": {
      const slot = state.nonlinearResult;
      const record = slot?.records.find((r) => r.id === recordId) ?? slot?.records.at(-1);
      return record && slot
        ? {
            family: "nonlinear" as const,
            record,
            current: record.signature === nonlinearSignature(state, slot.selection),
          }
        : null;
    }
    case "power": {
      const slot = state.powerResult;
      const record = slot?.records.find((r) => r.id === recordId) ?? slot?.records.at(-1);
      return record && slot
        ? {
            family: "power" as const,
            record,
            current: record.signature === savedPowerSignature(slot.selection),
          }
        : null;
    }
    default:
      return null;
  }
}

export function resultFamilies(state: ProjectState): AnalysisFamily[] {
  const all: AnalysisFamily[] = [];
  if (state.result) all.push("legacy");
  if (state.mixtureResult?.records.length) all.push("mixture");
  if (state.mixedModelResult?.records.length) all.push("repeated");
  if (state.nonlinearResult?.records.length) all.push("nonlinear");
  if (state.powerResult?.records.length) all.push("power");
  return all;
}

export function savedFamilyProvenance(saved: NonNullable<ReturnType<typeof savedFamily>>) {
  return saved.record.result.provenance;
}

export function savedFamilyDescription(
  state: ProjectState,
  t: TFunction,
  recordId?: string | null,
): string | null {
  const saved = savedFamily(state, recordId);
  if (!saved) return null;
  const data = state.revisions.find((r) => r.id === saved.record.revisionId)?.data;
  const responseId =
    saved.family === "mixture" || saved.family === "nonlinear"
      ? saved.record.input.responseId
      : saved.family === "repeated"
        ? saved.record.input.type === "paired"
          ? saved.record.input.responseId
          : saved.record.input.request.spec.responseId
        : null;
  const response = data?.responses.find((r) => r.id === responseId);
  return `${t(`family.${saved.family}`)}${response ? ` — ${response.name}${response.unit ? ` [${response.unit}]` : ""}` : ""}`;
}
