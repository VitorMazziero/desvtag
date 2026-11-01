// Monta o conjunto de dados e a solicitação ao motor a partir do estado digitado.
// Aqui só há conversão de texto em número e erros de célula; nenhuma estatística.
import type {
  Dataset,
  DesignFactor,
  Operation,
  SurfaceRequest,
  TermSpec,
} from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { parseNumberCell } from "../data/editing";

export interface CellError {
  row: number;
  column: number;
  code: "notANumber" | "notFinite" | "invalidUnitId";
}

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;

export function splitLevels(text: string): string[] {
  return text
    .split(/[;,\n]/)
    .map((l) => l.trim())
    .filter((l) => l !== "");
}

/** Converte o estado em `Dataset`; células ilegíveis viram erros (e `null`). */
export function buildDataset(state: ProjectState): { dataset: Dataset; cellErrors: CellError[] } {
  const cellErrors: CellError[] = [];
  const factorCount = state.factors.length;
  const dataset: Dataset = {
    factors: state.factors.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      unit: f.unit.trim() === "" ? null : f.unit,
      levels: f.kind === "categorical" ? splitLevels(f.levelsText) : [],
    })),
    responses: state.responses.map((r) => ({
      id: r.id,
      name: r.name,
      unit: r.unit.trim() === "" ? null : r.unit,
    })),
    observations: state.rows.map((row, rowIndex) => {
      const unit = row.unitId.trim();
      if (unit !== "" && !ID.test(unit))
        cellErrors.push({ row: rowIndex, column: 0, code: "invalidUnitId" });
      return {
        id: row.id,
        unitId: unit !== "" && ID.test(unit) ? unit : null,
        factors: state.factors.map((factor, i) => {
          const text = row.factors[i] ?? "";
          if (factor.kind === "categorical") return text.trim() === "" ? null : text.trim();
          const parsed = parseNumberCell(text);
          if (!parsed.ok) {
            cellErrors.push({ row: rowIndex, column: i + 1, code: parsed.code });
            return null;
          }
          return parsed.value;
        }),
        responses: state.responses.map((_, i) => {
          const parsed = parseNumberCell(row.responses[i] ?? "");
          if (!parsed.ok) {
            cellErrors.push({ row: rowIndex, column: factorCount + 1 + i, code: parsed.code });
            return null;
          }
          return parsed.value;
        }),
      };
    }),
  };
  return { dataset, cellErrors };
}

export type AnalysisKind = "descriptive" | "oneWay" | "design" | "surface";

/** O planejamento gerado é de superfície de resposta (composto central ou Box–Behnken). */
export function isSurfaceDesign(state: ProjectState): boolean {
  const type = state.design?.kind.type;
  return type === "centralComposite" || type === "boxBehnken";
}

/**
 * "Comparar tratamentos" executa a comparação de um fator; "Planejar experimento", a análise do
 * planejamento de dois níveis; "Analisar dados existentes", o resumo descritivo.
 */
export function analysisKind(state: ProjectState): AnalysisKind {
  // Um DIC gerado no caminho "Planejar" é analisado como comparação de tratamentos.
  if (state.path === "compare" || (state.path === "plan" && state.crd !== null)) return "oneWay";
  if (state.path === "plan") return isSurfaceDesign(state) ? "surface" : "design";
  return state.analysis.surface ? "surface" : "descriptive";
}

/**
 * Fatores da superfície e seus níveis (que definem a codificação). Com planejamento gerado, são os
 * níveis do planejamento; com matriz personalizada ou importada, o menor e o maior valor digitado de
 * cada fator quantitativo (apenas definem a escala; nenhuma estatística).
 */
export function surfaceFactors(state: ProjectState): DesignFactor[] {
  if (state.design) return state.design.factors;
  const { dataset } = buildDataset(state);
  return dataset.factors.flatMap((factor, index) => {
    if (factor.kind !== "numeric") return [];
    const values = dataset.observations
      .map((o) => o.factors[index])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return [];
    const low = Math.min(...values);
    const high = Math.max(...values);
    return [{ id: factor.id, name: factor.name || factor.id, low, high, unit: factor.unit }];
  });
}

/** Termos da superfície: lista vazia = modelo completo de segunda ordem (padrão do motor). */
export function surfaceTerms(state: ProjectState): TermSpec[] {
  return (state.analysis.designTerms ?? []).map((ids) =>
    ids.length === 1
      ? { type: "main", factorId: ids[0] as string }
      : ids.length === 2 && ids[0] === ids[1]
        ? { type: "power", factorId: ids[0] as string, degree: 2 }
        : { type: "interaction", factorIds: ids },
  );
}

/** Termos do modelo do planejamento: os escolhidos ou, por padrão, os efeitos principais. */
export function designTermIds(state: ProjectState): string[][] {
  if (state.analysis.designTerms) return state.analysis.designTerms;
  return (state.design?.factors ?? []).map((f) => [f.id]);
}

export function buildSurfaceRequest(
  state: ProjectState,
  dataset: Dataset,
  responseId: string,
): SurfaceRequest {
  return {
    dataset,
    responseId,
    factors: surfaceFactors(state),
    terms: surfaceTerms(state),
    alpha: state.analysis.alpha,
  };
}

export function buildOperation(state: ProjectState, dataset: Dataset): Operation | null {
  const responseId = state.analysis.responseId;
  if (responseId === null) return null;
  if (analysisKind(state) === "surface")
    return { type: "surfaceAnalyze", ...buildSurfaceRequest(state, dataset, responseId) };
  if (analysisKind(state) === "design") {
    if (state.design === null) return null;
    return {
      type: "designAnalyze",
      dataset,
      responseId,
      spec: state.design,
      terms: designTermIds(state).map((ids) =>
        ids.length === 1
          ? { type: "main", factorId: ids[0] as string }
          : { type: "interaction", factorIds: ids },
      ),
      alpha: state.analysis.alpha,
      includeCurvature: state.analysis.includeCurvature,
    };
  }
  if (analysisKind(state) === "oneWay") {
    const factorId = state.analysis.factorId;
    if (factorId === null) return null;
    return { type: "comparisonOneWay", dataset, responseId, factorId, alpha: state.analysis.alpha };
  }
  return { type: "descriptiveSummarize", dataset, responseId, groupBy: state.analysis.groupBy };
}

/** Assinatura dos dados e opções: muda quando qualquer entrada do resultado muda. */
export function inputSignature(state: ProjectState): string {
  const { dataset } = buildDataset(state);
  if (analysisKind(state) === "surface")
    return JSON.stringify([
      "surface",
      dataset,
      state.analysis.responseId,
      surfaceFactors(state),
      state.analysis.designTerms,
      state.analysis.alpha,
    ]);
  if (analysisKind(state) === "design")
    return JSON.stringify([
      "design",
      dataset,
      state.analysis.responseId,
      state.design,
      designTermIds(state),
      state.analysis.alpha,
      state.analysis.includeCurvature,
    ]);
  if (analysisKind(state) === "oneWay")
    return JSON.stringify([
      "oneWay",
      dataset,
      state.analysis.responseId,
      state.analysis.factorId,
      state.analysis.alpha,
    ]);
  return JSON.stringify([dataset, state.analysis.responseId, state.analysis.groupBy]);
}
