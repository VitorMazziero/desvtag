// Readable review targets shared by the interface and all report formats.
import type { TFunction } from "i18next";
import type { CommentTarget } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { analysisRecordLabel } from "../analysis/presentation";
export function commentTargetLabel(
  t: TFunction,
  state: ProjectState,
  target: CommentTarget,
  language: string,
): string {
  if (target.kind === "experiment") return t("comments.target.experiment");
  if (target.kind !== "analysis") {
    const key = target.key ?? "";
    const suffix = key.split("/").at(-1) ?? key;
    const name = t(`comments.names.${suffix}`, { defaultValue: suffix.replace(/[-_]/g, " ") });
    return t(`comments.target.${target.kind}`, { key: name });
  }
  const legacy = state.analyses.find((record) => record.id === target.analysisId);
  let description = target.analysisId ?? "";
  if (legacy) {
    const data = state.revisions.find((revision) => revision.id === legacy.revisionId)?.data;
    const historical = data
      ? { ...state, factors: data.factors, responses: data.responses }
      : state;
    description = analysisRecordLabel(t, historical, legacy, language);
  } else {
    const families = (
      [
        ["mixture", state.mixtureResult?.records],
        ["repeated", state.mixedModelResult?.records],
        ["nonlinear", state.nonlinearResult?.records],
        ["power", state.powerResult?.records],
      ] as const
    ).flatMap(([family, records]) => records?.map((record) => ({ family, record })) ?? []);
    const planning =
      state.optimalVariances.find((record) => record.id === target.analysisId) ??
      state.optimalDesigns.find((record) => record.id === target.analysisId);
    if (planning) {
      const title =
        "designId" in planning ? t("optimalVariance.title") : t("design.optimal.result");
      const date = new Date(planning.createdAt);
      description = `${title} · ${planning.revisionId} · ${Number.isNaN(date.getTime()) ? planning.createdAt : date.toLocaleString(language)}`;
    }
    const found = families.find(({ record }) => record.id === target.analysisId);
    if (found) {
      const method = found.record.result.provenance.methodId;
      const title =
        method === "paired_comparison"
          ? t("repeated.paired.title")
          : method === "linear_mixed_model"
            ? t("repeated.mixed.title")
            : t(`family.${found.family}`);
      const date = new Date(found.record.createdAt);
      description = `${title} · ${found.record.revisionId} · ${Number.isNaN(date.getTime()) ? found.record.createdAt : date.toLocaleString(language)}`;
    }
  }
  return t("comments.target.analysis", { analysis: description });
}
