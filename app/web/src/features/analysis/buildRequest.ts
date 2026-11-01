// Monta o conjunto de dados e a solicitação ao motor a partir do estado digitado.
// Aqui só há conversão de texto em número e erros de célula; nenhuma estatística.
import type { Dataset, Operation } from "../../services/engine";
import type { ProjectState } from "../../state/project";
import { parseNumberCell } from "../data/editing";

export interface CellError {
  row: number;
  column: number;
  code: "notANumber" | "notFinite" | "invalidUnitId";
}

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;

function splitLevels(text: string): string[] {
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

/** O caminho "Comparar tratamentos" executa a comparação de um fator; os demais, o resumo descritivo. */
export function analysisKind(state: ProjectState): "descriptive" | "oneWay" {
  return state.path === "compare" ? "oneWay" : "descriptive";
}

export function buildOperation(state: ProjectState, dataset: Dataset): Operation | null {
  const responseId = state.analysis.responseId;
  if (responseId === null) return null;
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
