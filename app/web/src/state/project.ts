// Estado em memória do projeto na ET02. O formato espelha os contratos C01 e
// será substituído pelo documento persistido na ET03 (P01). Células guardam o
// texto digitado; a conversão para números ocorre ao montar o conjunto de dados.
import type {
  AnalysisRecord,
  ConfirmationPlan,
  CrdSpec,
  DescriptiveResult,
  DesignAnalysisResult,
  DesignSpec,
  EntryPath as EntryPathContract,
  ExperimentData,
  ExperimentOrigin,
  FactorialResult,
  FactorialSetup,
  FactorKind,
  FactorSpec,
  FigureStyle,
  MixedSpec,
  MixtureModel,
  MixtureSpec,
  OneWayResult,
  OptimizationResult,
  OptimizationSetup,
  Procedure,
  ProcedureResult,
  RcbdSpec,
  ResponseSpec,
  Revision,
  RevisionReason,
  RowRecord,
  SurfaceResult,
} from "../services/engine";

// Os tipos do estado são os do documento do projeto (gerados do Rust): uma única fonte.
export type EntryPath = EntryPathContract;
export type FactorKindDraft = FactorKind;
/** Níveis categóricos em `levelsText`, separados por ponto e vírgula; vazio = os presentes nos dados. */
export type FactorDraft = FactorSpec;
export type ResponseDraft = ResponseSpec;
export type RowDraft = RowRecord;

export interface AnalysisDraft {
  responseId: string | null;
  groupBy: string[];
  /** Fator que define os grupos da comparação de tratamentos. */
  factorId: string | null;
  /** Nível de significância da família de comparações. */
  alpha: number;
  /** Termos do modelo do planejamento (cada termo = ids dos fatores); `null` = só efeitos principais. */
  designTerms: string[][] | null;
  /** Modelo escolhido de cada resposta (id → termos); `designTerms` é o da resposta analisada. */
  responseModels: Record<string, string[][]>;
  /** Incluir o termo de curvatura quando houver pontos centrais. */
  includeCurvature: boolean;
  /** Analisar como superfície de resposta (caminho "Analisar dados existentes"). */
  surface: boolean;
  /** Procedimento de comparação múltipla (`null` = Tukey, a comparação padrão). */
  procedure: Procedure | null;
  /** ANOVA multifatorial (com blocos); quando definida, substitui a comparação de um fator. */
  factorial: FactorialSetup | null;
}

export const DEFAULT_ALPHA = 0.05;

/** Otimização por desejabilidade do experimento: configuração, resultado e assinatura das entradas. */
export interface OptimizationState {
  /** Configuração em edição (objetivos, limites, domínio, busca); `null` = ainda não escolhida. */
  setup: OptimizationSetup | null;
  result: OptimizationResult | null;
  /** Assinatura dos dados e da configuração que geraram `result`. */
  signature: string | null;
}

export const EMPTY_OPTIMIZATION: OptimizationState = { setup: null, result: null, signature: null };

/** Resultado em exibição; `signature` identifica os dados e as opções que o geraram. */
export type StoredResult =
  | { signature: string; kind: "descriptive"; result: DescriptiveResult }
  | { signature: string; kind: "oneWay"; result: OneWayResult }
  | { signature: string; kind: "procedure"; result: ProcedureResult }
  | { signature: string; kind: "factorial"; result: FactorialResult }
  | { signature: string; kind: "design"; result: DesignAnalysisResult }
  | { signature: string; kind: "surface"; result: SurfaceResult };

/** Estado de trabalho de UM experimento (o que a interface edita) + seu histórico salvo. */
export interface ProjectState {
  id: string;
  name: string;
  path: EntryPath | null;
  /** Planejamento de dois níveis gerado (caminho "Planejar experimento"). */
  design: DesignSpec | null;
  /** Delineamento inteiramente casualizado (um fator categórico) gerado para o experimento. */
  crd: CrdSpec | null;
  /** Delineamento em blocos completos casualizados gerado para o experimento. */
  rcbd: RcbdSpec | null;
  mixed: MixedSpec | null;
  /** Planejamento de misturas gerado (v0.3). */
  mixture: MixtureSpec | null;
  /** Modelo de Scheffé escolhido na análise de misturas. */
  mixtureModel: MixtureModel;
  /** Personalização gráfica por figura (chave estável da figura → ajustes). */
  figureStyles: Record<string, FigureStyle>;
  factors: FactorDraft[];
  responses: ResponseDraft[];
  rows: RowDraft[];
  analysis: AnalysisDraft;
  result: StoredResult | null;
  /** Otimização (guardada como análise própria; não substitui `result`). */
  optimization: OptimizationState;
  /** Experimento de origem, se este é uma confirmação proposta por uma otimização. */
  origin: ExperimentOrigin | null;
  /** Previsões gravadas na proposta de confirmação. */
  confirmation: ConfirmationPlan | null;
  showUnitColumn: boolean;
  counters: { factor: number; response: number; row: number; revision: number; analysis: number };
  /** Instantâneos imutáveis dos dados; a última é o estado já registrado (pode haver edições posteriores). */
  revisions: Revision[];
  /** Análises guardadas, cada uma ligada à revisão que a gerou. */
  analyses: AnalysisRecord[];
  notes: string;
}

/** Dados atuais em ordem canônica de campos (comparação estável entre revisões). */
export function snapshotData(
  state: Pick<ProjectState, "factors" | "responses" | "rows">,
): ExperimentData {
  return {
    factors: state.factors.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      unit: f.unit,
      levelsText: f.levelsText,
    })),
    responses: state.responses.map((r) => ({ id: r.id, name: r.name, unit: r.unit })),
    rows: state.rows.map((r) => ({
      id: r.id,
      unitId: r.unitId,
      factors: [...r.factors],
      responses: [...r.responses],
    })),
  };
}

export function sameData(a: ExperimentData, b: ExperimentData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Cria um experimento vazio com a revisão inicial `created`. */
export function newExperiment(id: string, name: string, now: string): ProjectState {
  const base: ProjectState = {
    id,
    name,
    path: null,
    design: null,
    crd: null,
    rcbd: null,
    mixed: null,
    mixture: null,
    mixtureModel: "quadratic",
    figureStyles: {},
    factors: [],
    responses: [],
    rows: [],
    analysis: {
      responseId: null,
      groupBy: [],
      factorId: null,
      alpha: DEFAULT_ALPHA,
      designTerms: null,
      responseModels: {},
      includeCurvature: true,
      surface: false,
      procedure: null,
      factorial: null,
    },
    result: null,
    optimization: EMPTY_OPTIMIZATION,
    origin: null,
    confirmation: null,
    showUnitColumn: false,
    counters: { factor: 0, response: 0, row: 0, revision: 1, analysis: 0 },
    revisions: [],
    analyses: [],
    notes: "",
  };
  return {
    ...base,
    revisions: [
      {
        id: "v1",
        parent: null,
        createdAt: now,
        reason: "created",
        data: snapshotData(base),
        contentHash: "",
      },
    ],
  };
}

/** Registra uma revisão se os dados mudaram desde a última; devolve o mesmo estado se não mudaram. */
export function commitRevision(
  state: ProjectState,
  reason: RevisionReason,
  now: string,
): ProjectState {
  const data = snapshotData(state);
  const head = state.revisions[state.revisions.length - 1];
  if (head && sameData(head.data, data)) return state;
  const n = state.counters.revision + 1;
  const revision: Revision = {
    id: `v${n}`,
    parent: head?.id ?? null,
    createdAt: now,
    reason,
    data,
    contentHash: "",
  };
  return {
    ...state,
    revisions: [...state.revisions, revision],
    counters: { ...state.counters, revision: n },
  };
}

/** Primeiro identificador `prefixN` livre, a partir do contador. */
export function freshId(
  prefix: string,
  counter: number,
  used: Iterable<string>,
): { id: string; counter: number } {
  const taken = new Set(used);
  let n = counter + 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return { id: `${prefix}${n}`, counter: n };
}

export const initialProject: ProjectState = newExperiment(
  "e1",
  "Experimento 1",
  "1970-01-01T00:00:00.000Z",
);

export type ProjectAction =
  | { type: "choosePath"; path: EntryPath }
  | { type: "addFactor" }
  | { type: "updateFactor"; id: string; patch: Partial<Omit<FactorDraft, "id">> }
  | { type: "removeFactor"; id: string }
  | { type: "addResponse" }
  | { type: "updateResponse"; id: string; patch: Partial<Omit<ResponseDraft, "id">> }
  | { type: "removeResponse"; id: string }
  | { type: "setCell"; row: number; column: number; value: string }
  | { type: "setRows"; rows: RowDraft[]; counters: ProjectState["counters"] }
  | {
      type: "applyDesign";
      design: DesignSpec;
      rows: RowDraft[];
      counters: ProjectState["counters"];
      now: string;
    }
  | {
      type: "applyCrd";
      crd: CrdSpec;
      rows: RowDraft[];
      counters: ProjectState["counters"];
      now: string;
    }
  | {
      type: "applyMixture";
      mixture: MixtureSpec;
      rows: RowDraft[];
      counters: ProjectState["counters"];
      now: string;
    }
  | { type: "setMixtureModel"; model: MixtureModel }
  /** Planejamento ótimo aplicado: as linhas viram a matriz personalizada, analisada como superfície. */
  | {
      type: "applyOptimal";
      rows: RowDraft[];
      counters: ProjectState["counters"];
      now: string;
    }
  | {
      type: "applyMixed";
      mixed: MixedSpec;
      rows: RowDraft[];
      counters: ProjectState["counters"];
      factorial: FactorialSetup;
      now: string;
    }
  | {
      type: "applyRcbd";
      rcbd: RcbdSpec;
      rows: RowDraft[];
      counters: ProjectState["counters"];
      factorial: FactorialSetup;
      now: string;
    }
  | { type: "setFigureStyle"; key: string; style: FigureStyle | null }
  | { type: "addRow" }
  | { type: "removeRow"; row: number }
  | { type: "setUnitColumn"; visible: boolean }
  | { type: "setAnalysis"; patch: Partial<AnalysisDraft> }
  | { type: "setNotes"; notes: string }
  | { type: "rename"; name: string }
  | { type: "storeResult"; result: StoredResult; now: string }
  | { type: "setOptimizationSetup"; setup: OptimizationSetup }
  | {
      type: "storeOptimization";
      setup: OptimizationSetup;
      result: OptimizationResult;
      signature: string;
      now: string;
    }
  | { type: "applyImport"; data: ExperimentData; now: string }
  /** Planilha de coleta (ET13): grava só as respostas das linhas indicadas; o planejamento fica. */
  | {
      type: "applyResponses";
      cells: Array<{ row: number; response: number; text: string }>;
      now: string;
    }
  | { type: "restoreRevision"; revisionId: string; now: string };

/** Nova linha em branco com identificador ainda não usado. */
export function blankRow(
  state: Pick<ProjectState, "factors" | "responses" | "counters"> & { rows?: RowDraft[] },
): [RowDraft, ProjectState["counters"]] {
  const { id, counter } = freshId(
    "o",
    state.counters.row,
    (state.rows ?? []).map((r) => r.id),
  );
  return [
    {
      id,
      unitId: "",
      factors: state.factors.map(() => ""),
      responses: state.responses.map(() => ""),
    },
    { ...state.counters, row: counter },
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

function withData(state: ProjectState, data: ExperimentData): ProjectState {
  const used = (ids: string[], prefix: string) =>
    ids.reduce(
      (max, id) =>
        id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length))
          ? Math.max(max, Number(id.slice(prefix.length)))
          : max,
      0,
    );
  const counters = {
    ...state.counters,
    factor: Math.max(
      state.counters.factor,
      used(
        data.factors.map((f) => f.id),
        "f",
      ),
    ),
    response: Math.max(
      state.counters.response,
      used(
        data.responses.map((r) => r.id),
        "r",
      ),
    ),
    row: Math.max(
      state.counters.row,
      used(
        data.rows.map((r) => r.id),
        "o",
      ),
    ),
  };
  const firstResponse = data.responses[0]?.id ?? null;
  return {
    ...state,
    factors: data.factors.map((f) => ({ ...f })),
    responses: data.responses.map((r) => ({ ...r })),
    rows: data.rows.map((r) => ({ ...r, factors: [...r.factors], responses: [...r.responses] })),
    counters,
    analysis: {
      responseId: data.responses.some((r) => r.id === state.analysis.responseId)
        ? state.analysis.responseId
        : firstResponse,
      groupBy: state.analysis.groupBy.filter((id) => data.factors.some((f) => f.id === id)),
      factorId: data.factors.some((f) => f.id === state.analysis.factorId)
        ? state.analysis.factorId
        : null,
      alpha: state.analysis.alpha,
      designTerms: state.analysis.designTerms,
      responseModels: state.analysis.responseModels,
      includeCurvature: state.analysis.includeCurvature,
      surface: state.analysis.surface,
      procedure: state.analysis.procedure,
      factorial: state.analysis.factorial,
    },
    // O planejamento só vale enquanto todos os seus fatores existem.
    design: state.design?.factors.every((f) => data.factors.some((d) => d.id === f.id))
      ? state.design
      : null,
    crd: state.crd && data.factors.some((d) => d.id === state.crd?.factorId) ? state.crd : null,
    mixed:
      state.mixed && state.mixed.factors.every((f) => data.factors.some((d) => d.id === f.id))
        ? state.mixed
        : null,
    mixture:
      state.mixture &&
      state.mixture.components.every((c) => data.factors.some((d) => d.id === c.id))
        ? state.mixture
        : null,
  };
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "choosePath":
      return { ...state, path: action.path };
    case "addFactor": {
      const { id, counter } = freshId(
        "f",
        state.counters.factor,
        state.factors.map((f) => f.id),
      );
      const factor: FactorDraft = { id, name: "", kind: "categorical", unit: "", levelsText: "" };
      return {
        ...state,
        factors: [...state.factors, factor],
        rows: state.rows.map((r) => ({ ...r, factors: [...r.factors, ""] })),
        counters: { ...state.counters, factor: counter },
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
        crd: state.crd?.factorId === action.id ? null : state.crd,
        rcbd: state.rcbd?.factorId === action.id ? null : state.rcbd,
        mixed: state.mixed?.factors.some((f) => f.id === action.id) ? null : state.mixed,
        mixture: state.mixture?.components.some((c) => c.id === action.id) ? null : state.mixture,
        rows: state.rows.map((r) => ({ ...r, factors: r.factors.filter((_, i) => i !== index) })),
        analysis: {
          ...state.analysis,
          groupBy: state.analysis.groupBy.filter((g) => g !== action.id),
          factorId: state.analysis.factorId === action.id ? null : state.analysis.factorId,
          designTerms: state.analysis.designTerms
            ? state.analysis.designTerms.filter((term) => !term.includes(action.id))
            : null,
          responseModels: Object.fromEntries(
            Object.entries(state.analysis.responseModels).map(([id, terms]) => [
              id,
              terms.filter((term) => !term.includes(action.id)),
            ]),
          ),
        },
      };
    }
    case "addResponse": {
      const { id, counter } = freshId(
        "r",
        state.counters.response,
        state.responses.map((r) => r.id),
      );
      const response: ResponseDraft = { id, name: "", unit: "" };
      return {
        ...state,
        responses: [...state.responses, response],
        rows: state.rows.map((r) => ({ ...r, responses: [...r.responses, ""] })),
        counters: { ...state.counters, response: counter },
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
    case "applyDesign": {
      // Dados anteriores ficam preservados em uma revisão `edit`; a matriz gerada vira a nova revisão.
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        // Só o contador de linhas vem da ação: o de revisões já avançou em `before`.
        counters: { ...before.counters, row: action.counters.row },
        design: action.design,
        crd: null,
        rcbd: null,
        mixed: null,
        mixture: null,
        // Os termos pertencem ao tipo de planejamento anterior: voltam ao padrão.
        analysis: { ...before.analysis, designTerms: null, responseModels: {} },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "applyCrd": {
      // Mesmo tratamento do planejamento de dois níveis: dados anteriores ficam em uma revisão `edit`.
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        counters: { ...before.counters, row: action.counters.row },
        design: null,
        crd: action.crd,
        rcbd: null,
        mixed: null,
        mixture: null,
        // O fator do DIC define os grupos da comparação de tratamentos.
        analysis: {
          ...before.analysis,
          designTerms: null,
          responseModels: {},
          factorId: action.crd.factorId,
        },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "applyRcbd": {
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        counters: { ...before.counters, row: action.counters.row },
        design: null,
        crd: null,
        rcbd: action.rcbd,
        mixed: null,
        mixture: null,
        analysis: {
          ...before.analysis,
          designTerms: null,
          responseModels: {},
          factorId: null,
          procedure: null,
          factorial: action.factorial,
        },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "applyMixture": {
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        counters: { ...before.counters, row: action.counters.row },
        design: null,
        crd: null,
        rcbd: null,
        mixed: null,
        mixture: action.mixture,
        analysis: {
          ...before.analysis,
          designTerms: null,
          responseModels: {},
          factorId: null,
          procedure: null,
          factorial: null,
        },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "applyOptimal": {
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        counters: { ...before.counters, row: action.counters.row },
        design: null,
        crd: null,
        rcbd: null,
        mixed: null,
        mixture: null,
        analysis: {
          ...before.analysis,
          designTerms: null,
          responseModels: {},
          factorId: null,
          procedure: null,
          factorial: null,
          surface: true,
        },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "setMixtureModel":
      return { ...state, mixtureModel: action.model };
    case "applyMixed": {
      const before = commitRevision(state, "edit", action.now);
      const next: ProjectState = {
        ...before,
        rows: action.rows,
        counters: { ...before.counters, row: action.counters.row },
        design: null,
        crd: null,
        rcbd: null,
        mixed: action.mixed,
        mixture: null,
        analysis: {
          ...before.analysis,
          designTerms: null,
          responseModels: {},
          factorId: null,
          procedure: null,
          factorial: action.factorial,
        },
        result: null,
      };
      return commitRevision(next, "design", action.now);
    }
    case "setFigureStyle": {
      const { [action.key]: _removed, ...rest } = state.figureStyles;
      const empty = action.style === null || Object.keys(action.style).length === 0;
      return {
        ...state,
        figureStyles:
          empty || action.style === null ? rest : { ...rest, [action.key]: action.style },
      };
    }
    case "addRow": {
      const [row, counters] = blankRow(state);
      return { ...state, rows: [...state.rows, row], counters };
    }
    case "removeRow":
      return { ...state, rows: state.rows.filter((_, i) => i !== action.row) };
    case "setUnitColumn":
      return { ...state, showUnitColumn: action.visible };
    case "setAnalysis": {
      const next = { ...state.analysis, ...action.patch };
      const changedResponse =
        action.patch.responseId !== undefined &&
        action.patch.responseId !== state.analysis.responseId;
      if (action.patch.designTerms !== undefined) {
        // O modelo escolhido pertence à resposta analisada.
        const { [next.responseId ?? ""]: _old, ...rest } = next.responseModels;
        next.responseModels =
          next.designTerms && next.responseId
            ? { ...rest, [next.responseId]: next.designTerms }
            : rest;
      } else if (changedResponse) {
        // Trocar de resposta traz o modelo que ela já tinha (ou o completo).
        next.designTerms = next.responseId ? (next.responseModels[next.responseId] ?? null) : null;
      }
      return { ...state, analysis: next };
    }
    case "setNotes":
      return { ...state, notes: action.notes };
    case "rename":
      return { ...state, name: action.name };
    case "storeResult": {
      // A análise aponta para a revisão dos dados que a gerou: registra-se um instantâneo se houve edições.
      const committed = commitRevision(state, "analysis", action.now);
      const head = committed.revisions[committed.revisions.length - 1];
      if (!head) return state;
      const n = committed.counters.analysis + 1;
      const record: AnalysisRecord = {
        id: `a${n}`,
        createdAt: action.now,
        revisionId: head.id,
        signature: action.result.signature,
        methodId: action.result.result.provenance.methodId,
        methodVersion: action.result.result.provenance.methodVersion,
        engineVersion: action.result.result.provenance.engineVersion,
        options:
          action.result.kind === "oneWay" || action.result.kind === "procedure"
            ? {
                responseId: committed.analysis.responseId,
                groupBy: [],
                factorId: committed.analysis.factorId ?? undefined,
                alpha: committed.analysis.alpha,
                ...(action.result.kind === "procedure" && committed.analysis.procedure
                  ? { procedure: committed.analysis.procedure }
                  : {}),
              }
            : action.result.kind === "factorial"
              ? {
                  responseId: committed.analysis.responseId,
                  groupBy: [],
                  alpha: committed.analysis.alpha,
                  ...(committed.analysis.factorial
                    ? { factorial: committed.analysis.factorial }
                    : {}),
                }
              : action.result.kind === "design"
                ? {
                    responseId: committed.analysis.responseId,
                    groupBy: [],
                    alpha: committed.analysis.alpha,
                    terms: committed.analysis.designTerms ?? undefined,
                    includeCurvature: committed.analysis.includeCurvature,
                  }
                : action.result.kind === "surface"
                  ? {
                      responseId: committed.analysis.responseId,
                      groupBy: [],
                      alpha: committed.analysis.alpha,
                      terms: committed.analysis.designTerms ?? undefined,
                      surface: committed.analysis.surface || undefined,
                    }
                  : {
                      responseId: committed.analysis.responseId,
                      groupBy: committed.analysis.groupBy,
                    },
        result:
          action.result.kind === "oneWay"
            ? { type: "oneWayComparison", ...action.result.result }
            : action.result.kind === "procedure"
              ? { type: "multipleComparison", ...action.result.result }
              : action.result.kind === "factorial"
                ? { type: "factorialAnova", ...action.result.result }
                : action.result.kind === "design"
                  ? { type: "twoLevelDesign", ...action.result.result }
                  : action.result.kind === "surface"
                    ? { type: "responseSurface", ...action.result.result }
                    : { type: "descriptive", ...action.result.result },
      };
      return {
        ...committed,
        analyses: [...committed.analyses, record],
        counters: { ...committed.counters, analysis: n },
        result: action.result,
      };
    }
    case "setOptimizationSetup":
      return { ...state, optimization: { ...state.optimization, setup: action.setup } };
    case "storeOptimization": {
      const committed = commitRevision(state, "analysis", action.now);
      const head = committed.revisions[committed.revisions.length - 1];
      if (!head) return state;
      const n = committed.counters.analysis + 1;
      const record: AnalysisRecord = {
        id: `a${n}`,
        createdAt: action.now,
        revisionId: head.id,
        signature: action.signature,
        methodId: action.result.provenance.methodId,
        methodVersion: action.result.provenance.methodVersion,
        engineVersion: action.result.provenance.engineVersion,
        options: {
          responseId: null,
          groupBy: [],
          alpha: action.setup.alpha,
          optimization: action.setup,
        },
        result: { type: "optimization", ...action.result },
      };
      return {
        ...committed,
        analyses: [...committed.analyses, record],
        counters: { ...committed.counters, analysis: n },
        optimization: { setup: action.setup, result: action.result, signature: action.signature },
      };
    }
    case "applyImport": {
      const before = commitRevision(state, "edit", action.now);
      const next = withData(before, action.data);
      return commitRevision(next, "import", action.now);
    }
    case "applyResponses": {
      // Estado anterior preservado em uma revisão `edit`; as respostas viram a revisão `import`.
      const before = commitRevision(state, "edit", action.now);
      const factorCount = before.factors.length;
      const rows = before.rows.map((r, i) =>
        action.cells
          .filter((c) => c.row === i)
          .reduce(
            (acc, c) => setCellText(acc, 1 + factorCount + c.response, factorCount, c.text),
            r,
          ),
      );
      return commitRevision({ ...before, rows }, "import", action.now);
    }
    case "restoreRevision": {
      const before = commitRevision(state, "edit", action.now);
      const source = before.revisions.find((r) => r.id === action.revisionId);
      if (!source) return before;
      const restored = withData(before, source.data);
      const head = restored.revisions[restored.revisions.length - 1];
      if (head && sameData(head.data, snapshotData(restored))) return restored;
      const n = restored.counters.revision + 1;
      const revision: Revision = {
        id: `v${n}`,
        parent: source.id,
        createdAt: action.now,
        reason: "restore",
        data: snapshotData(restored),
        contentHash: "",
      };
      return {
        ...restored,
        revisions: [...restored.revisions, revision],
        counters: { ...restored.counters, revision: n },
      };
    }
  }
}
