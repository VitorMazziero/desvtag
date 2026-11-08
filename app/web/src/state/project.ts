import { type FamilyAction, familyRecordMetadata, reduceFamily } from "./familyActions";
import { matchesOptimalVariance } from "./optimalVariance";
import { commitRevision, freshId, sameData, snapshotData } from "./revisionOps";

export { commitRevision, freshId, sameData, snapshotData } from "./revisionOps";

// Estado em memória do projeto na ET02. O formato espelha os contratos C01 e
// será substituído pelo documento persistido na ET03 (P01). Células guardam o
// texto digitado; a conversão para números ocorre ao montar o conjunto de dados.
import type {
  AnalysisFamily,
  AnalysisRecord,
  Comment,
  CommentTarget,
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
  GeneratedOptimal,
  MixedSpec,
  MixtureModel,
  MixtureSpec,
  OneWayResult,
  OptimalArtifactSelection,
  OptimalDesignRecord,
  OptimalModelResult,
  OptimalVariance,
  OptimalVarianceRecord,
  OptimalVarianceView,
  OptimizationResult,
  OptimizationSetup,
  Procedure,
  ProcedureResult,
  RcbdSpec,
  ResponseSpec,
  Revision,
  RevisionReason,
  RowRecord,
  SavedMixture,
  SavedNonlinear,
  SavedPower,
  SavedRepeated,
  SurfaceBlockSpec,
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
  optimalDesignId?: string | null;
  surfaceBlock?: SurfaceBlockSpec | null;
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
  | { signature: string; kind: "optimal"; result: OptimalModelResult }
  | { signature: string; kind: "descriptive"; result: DescriptiveResult }
  | { signature: string; kind: "oneWay"; result: OneWayResult }
  | { signature: string; kind: "procedure"; result: ProcedureResult }
  | { signature: string; kind: "factorial"; result: FactorialResult }
  | { signature: string; kind: "design"; result: DesignAnalysisResult }
  | { signature: string; kind: "surface"; result: SurfaceResult };

/** Estado de trabalho de UM experimento (o que a interface edita) + seu histórico salvo. */
export interface ProjectState {
  optimalDesigns: OptimalDesignRecord[];
  optimalVariances: OptimalVarianceRecord[];
  optimalArtifactSelection?: OptimalArtifactSelection;
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
  /** Editable selections and immutable calculated records, absent in older documents. */
  mixtureResult: SavedMixture | null;
  mixedModelResult: SavedRepeated | null;
  nonlinearResult: SavedNonlinear | null;
  powerResult: SavedPower | null;
  activeFamily: AnalysisFamily;
  /** Personalização gráfica por figura (chave estável da figura → ajustes). */
  figureStyles: Record<string, FigureStyle>;
  /** Comentários de revisão ligados a análises, figuras e tabelas (v0.3). */
  comments: Comment[];
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
  showTimeColumn: boolean;
  counters: { factor: number; response: number; row: number; revision: number; analysis: number };
  /** Instantâneos imutáveis dos dados; a última é o estado já registrado (pode haver edições posteriores). */
  revisions: Revision[];
  /** Análises guardadas, cada uma ligada à revisão que a gerou. */
  analyses: AnalysisRecord[];
  notes: string;
}

/** Cria um experimento vazio com a revisão inicial `created`. */
export function newExperiment(id: string, name: string, now: string): ProjectState {
  const base: ProjectState = {
    optimalDesigns: [],
    optimalVariances: [],
    id,
    name,
    path: null,
    design: null,
    crd: null,
    rcbd: null,
    mixed: null,
    mixture: null,
    mixtureModel: "quadratic",
    mixtureResult: null,
    mixedModelResult: null,
    nonlinearResult: null,
    powerResult: null,
    activeFamily: "legacy",
    figureStyles: {},
    comments: [],
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
      surfaceBlock: null,
      procedure: null,
      factorial: null,
    },
    result: null,
    optimization: EMPTY_OPTIMIZATION,
    origin: null,
    confirmation: null,
    showUnitColumn: false,
    showTimeColumn: false,
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

export const initialProject: ProjectState = newExperiment(
  "e1",
  "Experimento 1",
  "1970-01-01T00:00:00.000Z",
);

export interface CalculationSource {
  projectId: string;
  epoch: number;
  experimentId: string;
  data: ExperimentData;
  analysis: AnalysisDraft;
  startedAt: string;
}

export function captureCalculationSource(
  scope: { projectId: string; epoch: number },
  state: ProjectState,
  startedAt: string,
): CalculationSource {
  return {
    projectId: scope.projectId,
    epoch: scope.epoch,
    experimentId: state.id,
    data: snapshotData(state),
    analysis: state.analysis,
    startedAt,
  };
}

function calculationRevision(
  state: ProjectState,
  source: CalculationSource | undefined,
  now: string,
) {
  if (!source) {
    const committed = commitRevision(state, "analysis", now);
    return { state: committed, revisionId: committed.revisions.at(-1)?.id };
  }
  const known = state.revisions.find((revision) => sameData(revision.data, source.data));
  if (known) return { state, revisionId: known.id };
  const data = snapshotData(state);
  const captured = commitRevision({ ...state, ...source.data }, "analysis", source.startedAt);
  return {
    state: commitRevision({ ...captured, ...data }, "edit", now),
    revisionId: captured.revisions.at(-1)?.id,
  };
}

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
      generated?: GeneratedOptimal;
      variance?: OptimalVariance;
      varianceView?: OptimalVarianceView;
      signature?: string;
      factors?: FactorDraft[];
      terms?: string[][];
      blockFactorId?: string;
      rowIds?: string[];
      augment?: boolean;
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
  | { type: "addComment"; target: CommentTarget; text: string; author: string; now: string }
  | { type: "editComment"; id: string; text: string; now: string }
  | { type: "replyComment"; id: string; text: string; author: string; now: string }
  | { type: "setCommentResolved"; id: string; resolved: boolean; now: string }
  | { type: "deleteComment"; id: string }
  | { type: "addRow" }
  | { type: "removeRow"; row: number }
  | { type: "setUnitColumn"; visible: boolean }
  | { type: "setTimeColumn"; visible: boolean }
  | { type: "setAnalysis"; patch: Partial<AnalysisDraft> }
  | { type: "setNotes"; notes: string }
  | { type: "rename"; name: string }
  | { type: "storeResult"; result: StoredResult; source?: CalculationSource; now: string }
  | { type: "setOptimizationSetup"; setup: OptimizationSetup }
  | {
      type: "storeOptimization";
      source?: CalculationSource;
      setup: OptimizationSetup;
      result: OptimizationResult;
      signature: string;
      now: string;
    }
  | {
      type: "storeOptimalVariance";
      source: CalculationSource;
      designId: string;
      result: OptimalVariance;
      view?: OptimalVarianceView;
      now: string;
    }
  | { type: "selectOptimalDesign"; designId?: string }
  | { type: "selectOptimalVariance"; designId: string; varianceId?: string }
  | { type: "setOptimalVarianceView"; varianceId: string; view: OptimalVarianceView }
  | { type: "applyImport"; data: ExperimentData; now: string }
  /** Planilha de coleta (ET13): grava só as respostas das linhas indicadas; o planejamento fica. */
  | {
      type: "applyResponses";
      cells: Array<{ row: number; response: number; text: string }>;
      now: string;
    }
  | { type: "restoreRevision"; revisionId: string; now: string }
  | FamilyAction;

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
  if (column === factorCount + row.responses.length + 1)
    return { ...row, timeText: value || undefined };
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
    showTimeColumn: data.rows.some((r) => r.timeText !== undefined && r.timeText !== null),
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
      surfaceBlock: state.analysis.surfaceBlock,
      optimalDesignId: state.analysis.optimalDesignId,
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
  if (
    action.type === "storeFamily" ||
    action.type === "setFamilySelection" ||
    action.type === "selectFamily"
  )
    return reduceFamily(state, action);
  switch (action.type) {
    case "choosePath":
      return { ...state, path: action.path };
    case "addFactor": {
      const { id, counter } = freshId(
        "f",
        state.counters.factor,
        state.factors.map((f) => f.id),
      );
      const factor: FactorDraft = {
        id,
        name: "",
        kind: state.path === "plan" ? "numeric" : "categorical",
        unit: "",
        levelsText: "",
      };
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
          optimalDesignId: null,
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
          optimalDesignId: null,
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
        factors: action.factors ?? before.factors,
        counters: { ...before.counters, row: action.counters.row, factor: action.counters.factor },
        design: null,
        crd: null,
        rcbd: null,
        mixed: null,
        mixture: null,
        analysis: {
          ...before.analysis,
          designTerms: action.terms ?? null,
          responseModels: action.terms
            ? Object.fromEntries(
                before.responses.map((response) => [response.id, action.terms ?? []]),
              )
            : {},
          factorId: null,
          procedure: null,
          factorial: null,
          optimalDesignId: null,
          surface: !action.generated?.spec.categories,
          surfaceBlock:
            action.blockFactorId && action.generated?.spec.blocks
              ? {
                  factorId: action.blockFactorId,
                  reference: action.generated.spec.blocks.labels[0] ?? "",
                }
              : null,
        },
        result: null,
      };
      const applied = commitRevision(next, "design", action.now);
      if (!action.generated) return applied;
      const identity = freshId("a", applied.counters.analysis, [
        ...applied.analyses.map((record) => record.id),
        ...familyRecordMetadata(applied).map((record) => record.id),
      ]);
      const withDesign = {
        ...applied,
        optimalArtifactSelection: updateOptimalSelection(applied, { designId: undefined }),
        analysis: {
          ...applied.analysis,
          optimalDesignId: action.generated.spec.categories ? identity.id : null,
        },
        counters: { ...applied.counters, analysis: identity.counter },
        optimalDesigns: [
          ...applied.optimalDesigns,
          {
            id: identity.id,
            createdAt: action.now,
            augment: action.augment ?? false,
            sourceRevisionId: before.revisions.at(-1)?.id ?? "v1",
            revisionId: applied.revisions.at(-1)?.id ?? "v1",
            signature: action.signature ?? "",
            rowIds: action.rowIds ?? [],
            blockFactorId: action.blockFactorId,
            result: action.generated,
          },
        ],
      };
      return action.variance
        ? appendOptimalVariance(
            withDesign,
            identity.id,
            action.variance,
            action.now,
            action.varianceView,
          )
        : withDesign;
    }
    case "storeOptimalVariance":
      return appendOptimalVariance(state, action.designId, action.result, action.now, action.view);
    case "selectOptimalDesign":
      if (action.designId === state.optimalArtifactSelection?.designId) return state;
      if (action.designId && !state.optimalDesigns.some((record) => record.id === action.designId))
        return state;
      return {
        ...state,
        optimalArtifactSelection: updateOptimalSelection(state, { designId: action.designId }),
      };
    case "selectOptimalVariance":
      if (!state.optimalDesigns.some((record) => record.id === action.designId)) return state;
      if (action.varianceId === state.optimalArtifactSelection?.varianceByDesign[action.designId])
        return state;
      if (
        action.varianceId &&
        !state.optimalVariances.some(
          (record) => record.id === action.varianceId && record.designId === action.designId,
        )
      )
        return state;
      return {
        ...state,
        optimalArtifactSelection: selectOptimalVariance(state, action.designId, action.varianceId),
      };
    case "setOptimalVarianceView":
      if (!state.optimalVariances.some((record) => record.id === action.varianceId)) return state;
      return {
        ...state,
        optimalVariances: state.optimalVariances.map((record) =>
          record.id === action.varianceId ? { ...record, view: action.view } : record,
        ),
      };
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
          optimalDesignId: null,
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
    case "addComment": {
      const text = action.text.trim();
      if (text === "") return state;
      // A revisão do comentário é a da análise a que ele se refere; sem análise, a mais recente.
      const analysis = state.analyses.find((a) => a.id === action.target.analysisId);
      const revisionId =
        analysis?.revisionId ??
        familyRecordMetadata(state).find((r) => r.id === action.target.analysisId)?.revisionId ??
        state.revisions[state.revisions.length - 1]?.id;
      if (!revisionId) return state;
      const { id } = freshId(
        "c",
        state.comments.length,
        state.comments.map((c) => c.id),
      );
      const comment: Comment = {
        id,
        target: action.target,
        revisionId,
        ...(action.author.trim() !== "" ? { author: action.author.trim() } : {}),
        text,
        createdAt: action.now,
      };
      return { ...state, comments: [...state.comments, comment] };
    }
    case "editComment": {
      const text = action.text.trim();
      if (text === "" || Array.from(text).length > 2000) return state;
      const comment = state.comments.find((c) => c.id === action.id);
      if (!comment || comment.text === text) return state;
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === action.id ? { ...c, text, editedAt: action.now } : c,
        ),
      };
    }
    case "replyComment": {
      const text = action.text.trim();
      if (text === "") return state;
      return {
        ...state,
        comments: state.comments.map((c) => {
          if (c.id !== action.id) return c;
          const replies = c.replies ?? [];
          const { id } = freshId(
            `${c.id}-r`,
            replies.length,
            replies.map((r) => r.id),
          );
          return {
            ...c,
            replies: [
              ...replies,
              {
                id,
                ...(action.author.trim() !== "" ? { author: action.author.trim() } : {}),
                text,
                createdAt: action.now,
              },
            ],
          };
        }),
      };
    }
    case "setCommentResolved":
      return {
        ...state,
        comments: state.comments.map((c) => {
          if (c.id !== action.id) return c;
          const { resolvedAt: _resolvedAt, ...open } = c;
          return action.resolved ? { ...open, resolvedAt: action.now } : open;
        }),
      };
    case "deleteComment":
      return { ...state, comments: state.comments.filter((c) => c.id !== action.id) };
    case "addRow": {
      const [row, counters] = blankRow(state);
      return { ...state, rows: [...state.rows, row], counters };
    }
    case "removeRow":
      return { ...state, rows: state.rows.filter((_, i) => i !== action.row) };
    case "setTimeColumn":
      return { ...state, showTimeColumn: action.visible };
    case "setUnitColumn":
      return { ...state, showUnitColumn: action.visible };
    case "setAnalysis": {
      const next = { ...state.analysis, ...action.patch };
      if (
        action.patch.optimalDesignId === undefined &&
        (action.patch.factorial !== undefined ||
          action.patch.surface !== undefined ||
          action.patch.procedure !== undefined)
      )
        next.optimalDesignId = null;
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
      const captured = calculationRevision(state, action.source, action.now);
      const committed = captured.state;
      if (!captured.revisionId) return state;
      const computation = action.source?.analysis ?? committed.analysis;
      const n = committed.counters.analysis + 1;
      const record: AnalysisRecord = {
        id: `a${n}`,
        createdAt: action.now,
        revisionId: captured.revisionId,
        signature: action.result.signature,
        methodId: action.result.result.provenance.methodId,
        methodVersion: action.result.result.provenance.methodVersion,
        engineVersion: action.result.result.provenance.engineVersion,
        options:
          action.result.kind === "optimal"
            ? {
                responseId: computation.responseId,
                groupBy: [],
                alpha: computation.alpha,
                optimalDesignId: computation.optimalDesignId ?? undefined,
              }
            : action.result.kind === "oneWay" || action.result.kind === "procedure"
              ? {
                  responseId: computation.responseId,
                  groupBy: [],
                  factorId: computation.factorId ?? undefined,
                  alpha: computation.alpha,
                  ...(action.result.kind === "procedure" && computation.procedure
                    ? { procedure: computation.procedure }
                    : {}),
                }
              : action.result.kind === "factorial"
                ? {
                    responseId: computation.responseId,
                    groupBy: [],
                    alpha: computation.alpha,
                    ...(computation.factorial ? { factorial: computation.factorial } : {}),
                  }
                : action.result.kind === "design"
                  ? {
                      responseId: computation.responseId,
                      groupBy: [],
                      alpha: computation.alpha,
                      terms: computation.designTerms ?? undefined,
                      includeCurvature: computation.includeCurvature,
                    }
                  : action.result.kind === "surface"
                    ? {
                        responseId: computation.responseId,
                        groupBy: [],
                        alpha: computation.alpha,
                        terms: computation.designTerms ?? undefined,
                        surface: computation.surface || undefined,
                        surfaceBlock: computation.surfaceBlock ?? undefined,
                      }
                    : {
                        responseId: computation.responseId,
                        groupBy: computation.groupBy,
                      },
        result:
          action.result.kind === "optimal"
            ? { type: "optimalModel", ...action.result.result }
            : action.result.kind === "oneWay"
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
        activeFamily: "legacy",
      };
    }
    case "setOptimizationSetup":
      return { ...state, optimization: { ...state.optimization, setup: action.setup } };
    case "storeOptimization": {
      const captured = calculationRevision(state, action.source, action.now);
      const committed = captured.state;
      if (!captured.revisionId) return state;
      const computation = action.source?.analysis ?? committed.analysis;
      const n = committed.counters.analysis + 1;
      const record: AnalysisRecord = {
        id: `a${n}`,
        createdAt: action.now,
        revisionId: captured.revisionId,
        signature: action.signature,
        methodId: action.result.provenance.methodId,
        methodVersion: action.result.provenance.methodVersion,
        engineVersion: action.result.provenance.engineVersion,
        options: {
          responseId: null,
          groupBy: [],
          alpha: action.setup.alpha,
          optimization: action.setup,
          surfaceBlock: computation.surfaceBlock ?? undefined,
        },
        result: { type: "optimization", ...action.result },
      };
      return {
        ...committed,
        analyses: [...committed.analyses, record],
        counters: { ...committed.counters, analysis: n },
        optimization: {
          setup: action.source ? (state.optimization.setup ?? action.setup) : action.setup,
          result: action.result,
          signature: action.signature,
        },
        activeFamily: "legacy",
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

function updateOptimalSelection(
  state: ProjectState,
  patch: Partial<OptimalArtifactSelection>,
): OptimalArtifactSelection | undefined {
  const next = { varianceByDesign: {}, ...state.optimalArtifactSelection, ...patch };
  return next.designId || Object.keys(next.varianceByDesign).length ? next : undefined;
}

function selectOptimalVariance(
  state: ProjectState,
  designId: string,
  varianceId?: string,
): OptimalArtifactSelection | undefined {
  const varianceByDesign = { ...state.optimalArtifactSelection?.varianceByDesign };
  if (varianceId) varianceByDesign[designId] = varianceId;
  else delete varianceByDesign[designId];
  return updateOptimalSelection(state, { varianceByDesign });
}

/** A new supplement gets its own identity; original designs and older profiles remain intact. */
function appendOptimalVariance(
  state: ProjectState,
  designId: string,
  result: OptimalVariance,
  now: string,
  view?: OptimalVarianceView,
): ProjectState {
  const design = state.optimalDesigns.find((record) => record.id === designId);
  if (!design || !matchesOptimalVariance(design.result, result)) return state;
  const identity = freshId("a", state.counters.analysis, [
    ...state.analyses.map((record) => record.id),
    ...familyRecordMetadata(state).map((record) => record.id),
  ]);
  return {
    ...state,
    optimalArtifactSelection: selectOptimalVariance(state, designId),
    counters: { ...state.counters, analysis: identity.counter },
    optimalVariances: [
      ...state.optimalVariances,
      { id: identity.id, createdAt: now, designId, revisionId: design.revisionId, result, view },
    ],
  };
}
