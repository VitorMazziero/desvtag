// Estado em memória do projeto na ET02. O formato espelha os contratos C01 e
// será substituído pelo documento persistido na ET03 (P01). Células guardam o
// texto digitado; a conversão para números ocorre ao montar o conjunto de dados.
import type { DescriptiveResult } from "../services/engine";

export type EntryPath = "plan" | "analyze" | "compare";
export type FactorKindDraft = "numeric" | "categorical";

export interface FactorDraft {
  id: string;
  name: string;
  kind: FactorKindDraft;
  unit: string;
  /** Níveis categóricos separados por vírgula ou ponto e vírgula; vazio = os presentes nos dados. */
  levelsText: string;
}

export interface ResponseDraft {
  id: string;
  name: string;
  unit: string;
}

export interface RowDraft {
  id: string;
  unitId: string;
  factors: string[];
  responses: string[];
}

export interface AnalysisDraft {
  responseId: string | null;
  groupBy: string[];
}

export interface StoredResult {
  /** Assinatura dos dados e das opções que geraram o resultado. */
  signature: string;
  result: DescriptiveResult;
}

export interface ProjectState {
  path: EntryPath | null;
  factors: FactorDraft[];
  responses: ResponseDraft[];
  rows: RowDraft[];
  analysis: AnalysisDraft;
  result: StoredResult | null;
  showUnitColumn: boolean;
  counters: { factor: number; response: number; row: number };
}

export const initialProject: ProjectState = {
  path: null,
  factors: [],
  responses: [],
  rows: [],
  analysis: { responseId: null, groupBy: [] },
  result: null,
  showUnitColumn: false,
  counters: { factor: 0, response: 0, row: 0 },
};

export type ProjectAction =
  | { type: "choosePath"; path: EntryPath }
  | { type: "reset" }
  | { type: "addFactor" }
  | { type: "updateFactor"; id: string; patch: Partial<Omit<FactorDraft, "id">> }
  | { type: "removeFactor"; id: string }
  | { type: "addResponse" }
  | { type: "updateResponse"; id: string; patch: Partial<Omit<ResponseDraft, "id">> }
  | { type: "removeResponse"; id: string }
  | { type: "setCell"; row: number; column: number; value: string }
  | { type: "setRows"; rows: RowDraft[]; counters: ProjectState["counters"] }
  | { type: "addRow" }
  | { type: "removeRow"; row: number }
  | { type: "setUnitColumn"; visible: boolean }
  | { type: "setAnalysis"; patch: Partial<AnalysisDraft> }
  | { type: "storeResult"; result: StoredResult };

export function blankRow(
  state: Pick<ProjectState, "factors" | "responses" | "counters">,
): [RowDraft, ProjectState["counters"]] {
  const n = state.counters.row + 1;
  return [
    {
      id: `o${n}`,
      unitId: "",
      factors: state.factors.map(() => ""),
      responses: state.responses.map(() => ""),
    },
    { ...state.counters, row: n },
  ];
}

/** Coluna `column`: 0 = unidade; 1..F = fatores; F+1.. = respostas. */
export function setCellText(
  row: RowDraft,
  column: number,
  factorCount: number,
  value: string,
): RowDraft {
  if (column === 0) return { ...row, unitId: value };
  if (column <= factorCount) {
    const factors = row.factors.slice();
    factors[column - 1] = value;
    return { ...row, factors };
  }
  const responses = row.responses.slice();
  responses[column - 1 - factorCount] = value;
  return { ...row, responses };
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "choosePath":
      return { ...state, path: action.path };
    case "reset":
      return initialProject;
    case "addFactor": {
      const n = state.counters.factor + 1;
      const factor: FactorDraft = {
        id: `f${n}`,
        name: "",
        kind: "categorical",
        unit: "",
        levelsText: "",
      };
      return {
        ...state,
        factors: [...state.factors, factor],
        rows: state.rows.map((r) => ({ ...r, factors: [...r.factors, ""] })),
        counters: { ...state.counters, factor: n },
      };
    }
    case "updateFactor":
      return {
        ...state,
        factors: state.factors.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)),
      };
    case "removeFactor": {
      const index = state.factors.findIndex((f) => f.id === action.id);
      if (index < 0) return state;
      return {
        ...state,
        factors: state.factors.filter((f) => f.id !== action.id),
        rows: state.rows.map((r) => ({ ...r, factors: r.factors.filter((_, i) => i !== index) })),
        analysis: {
          ...state.analysis,
          groupBy: state.analysis.groupBy.filter((g) => g !== action.id),
        },
      };
    }
    case "addResponse": {
      const n = state.counters.response + 1;
      const response: ResponseDraft = { id: `r${n}`, name: "", unit: "" };
      return {
        ...state,
        responses: [...state.responses, response],
        rows: state.rows.map((r) => ({ ...r, responses: [...r.responses, ""] })),
        counters: { ...state.counters, response: n },
        analysis: state.analysis.responseId
          ? state.analysis
          : { ...state.analysis, responseId: response.id },
      };
    }
    case "updateResponse":
      return {
        ...state,
        responses: state.responses.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };
    case "removeResponse": {
      const index = state.responses.findIndex((r) => r.id === action.id);
      if (index < 0) return state;
      const responses = state.responses.filter((r) => r.id !== action.id);
      return {
        ...state,
        responses,
        rows: state.rows.map((r) => ({
          ...r,
          responses: r.responses.filter((_, i) => i !== index),
        })),
        analysis: {
          ...state.analysis,
          responseId:
            state.analysis.responseId === action.id
              ? (responses[0]?.id ?? null)
              : state.analysis.responseId,
        },
      };
    }
    case "setCell":
      return {
        ...state,
        rows: state.rows.map((r, i) =>
          i === action.row ? setCellText(r, action.column, state.factors.length, action.value) : r,
        ),
      };
    case "setRows":
      return { ...state, rows: action.rows, counters: action.counters };
    case "addRow": {
      const [row, counters] = blankRow(state);
      return { ...state, rows: [...state.rows, row], counters };
    }
    case "removeRow":
      return { ...state, rows: state.rows.filter((_, i) => i !== action.row) };
    case "setUnitColumn":
      return { ...state, showUnitColumn: action.visible };
    case "setAnalysis":
      return { ...state, analysis: { ...state.analysis, ...action.patch } };
    case "storeResult":
      return { ...state, result: action.result };
  }
}
