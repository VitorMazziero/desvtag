import type { TFunction } from "i18next";
import type { AnalysisOptions, AnalysisRecord } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { termLabel } from "./surfaceTerms";

/** Nomes e configuração já registrados; nenhuma decisão estatística é feita aqui. */
export function analysisDescription(
  t: TFunction,
  state: ProjectState,
  options: AnalysisOptions,
  method: string,
  revisionId?: string,
): string {
  const data = revisionId
    ? (state.revisions.find((revision) => revision.id === revisionId)?.data ?? state)
    : state;
  const optimal = state.optimalDesigns.find((design) => design.id === options.optimalDesignId);
  const name = (id: string) => data.factors.find((f) => f.id === id)?.name || id;
  const response =
    data.responses.find((r) => r.id === options.responseId)?.name || options.responseId || "—";
  const terms = options.terms?.map((term) => termLabel(term, name)).join(" + ");
  const model =
    (optimal
      ? `${t(`design.optimal.models.${optimal.result.spec.model}`)}: ${[...optimal.result.spec.factors.map((f) => f.name), ...(optimal.result.spec.categories?.factors.map((f) => f.name) ?? [])].join(" + ")}`
      : "") ||
    terms ||
    (options.factorial
      ? options.factorial.factorIds.map(name).join(" × ")
      : options.factorId
        ? name(options.factorId)
        : options.groupBy.map(name).join(" × ")) ||
    t("analysis.allObservations");
  const block = optimal?.result.spec.blocks
    ? `; ${t("blocking.title")}: ${optimal.result.spec.blocks.labels.join(", ")}`
    : options.factorial?.blockId
      ? `; ${t("analysis.method.block")}: ${name(options.factorial.blockId)}`
      : options.surfaceBlock
        ? `; ${t("blocking.summary", { name: name(options.surfaceBlock.factorId), reference: options.surfaceBlock.reference })}`
        : "";
  const procedure = options.factorial
    ? t("analysis.method.factorial")
    : options.procedure
      ? t(`analysis.method.procedures.${options.procedure.type}`)
      : t(`analysis.methodNames.${method}`, { defaultValue: method });
  return t(revisionId === undefined ? "analysis.summaryText" : "analysis.recordSummaryText", {
    response,
    method: procedure,
    model: `${model}${block}${options.alpha === undefined ? "" : `; α = ${options.alpha}`}`,
  });
}
export function analysisRecordLabel(
  t: TFunction,
  state: ProjectState,
  record: AnalysisRecord,
  language: string,
): string {
  return `${analysisDescription(t, state, record.options, record.methodId, record.revisionId)} · ${record.revisionId} · ${new Date(record.createdAt).toLocaleString(language)}`;
}
