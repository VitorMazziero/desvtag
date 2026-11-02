// Espaço de trabalho: o projeto aberto (vários experimentos) e o controle de alterações.
// O reducer do experimento atual vem de `project.ts`; aqui ficam as ações do projeto.
import type {
  AnalysisRecord,
  ConfirmationPlan,
  ProjectDocument,
  RevisionReason,
} from "../services/engine";
import {
  commitRevision,
  DEFAULT_ALPHA,
  freshId,
  newExperiment,
  type ProjectAction,
  type ProjectState,
  projectReducer,
  type StoredResult,
} from "./project";

export interface Workspace {
  projectId: string;
  name: string;
  createdAt: string;
  experiments: ProjectState[];
  currentId: string;
  counters: { experiment: number };
  /** Incrementa a cada alteração; comparado com `savedSeq` indica alterações não salvas no arquivo. */
  changeSeq: number;
  /** Valor de `changeSeq` no último salvamento em arquivo (ou na abertura). */
  savedSeq: number;
  /** Nome do arquivo ligado ao projeto (sem caminho), se houver. */
  fileName: string | null;
  lastSavedAt: string | null;
  /** Incrementa quando o projeto é substituído (novo, aberto, restaurado): a interface remonta o fluxo. */
  epoch: number;
}

export type WorkspaceAction =
  | ProjectAction
  | { type: "newProject"; projectId: string; name: string; experimentName: string; now: string }
  | { type: "loadDocument"; document: ProjectDocument; fileName: string | null; now: string }
  | { type: "renameProject"; name: string }
  | { type: "addExperiment"; name: string; now: string }
  | { type: "selectExperiment"; id: string }
  | { type: "commitAll"; reason: RevisionReason; now: string }
  | { type: "markSaved"; fileName: string | null; now: string; seq: number }
  | { type: "restoreWorkspace"; workspace: Workspace }
  | {
      type: "addConfirmation";
      name: string;
      now: string;
      rows: ProjectState["rows"];
      plan: ConfirmationPlan;
    };

const PROJECT_ACTIONS = new Set<string>([
  "choosePath",
  "addFactor",
  "updateFactor",
  "removeFactor",
  "addResponse",
  "updateResponse",
  "removeResponse",
  "setCell",
  "setRows",
  "applyDesign",
  "applyCrd",
  "applyRcbd",
  "applyMixed",
  "applyMixture",
  "setMixtureModel",
  "setFigureStyle",
  "addRow",
  "removeRow",
  "setUnitColumn",
  "setAnalysis",
  "setNotes",
  "rename",
  "storeResult",
  "setOptimizationSetup",
  "storeOptimization",
  "applyImport",
  "applyResponses",
  "restoreRevision",
]);

export function createWorkspace(
  projectId: string,
  name: string,
  experimentName: string,
  now: string,
): Workspace {
  const experiment = newExperiment("e1", experimentName, now);
  return {
    projectId,
    name,
    createdAt: now,
    experiments: [experiment],
    currentId: experiment.id,
    counters: { experiment: 1 },
    changeSeq: 0,
    savedSeq: 0,
    fileName: null,
    lastSavedAt: null,
    epoch: 0,
  };
}

const FALLBACK_EXPERIMENT = newExperiment("e1", "Experimento 1", "1970-01-01T00:00:00.000Z");

export const initialWorkspace: Workspace = createWorkspace(
  "p-initial",
  "",
  "Experimento 1",
  "1970-01-01T00:00:00.000Z",
);

export function currentExperiment(ws: Workspace): ProjectState {
  return (
    ws.experiments.find((e) => e.id === ws.currentId) ?? ws.experiments[0] ?? FALLBACK_EXPERIMENT
  );
}

/** Registra uma revisão em cada experimento cujos dados mudaram (a operação de salvar usa isto). */
export function commitWorkspace(ws: Workspace, reason: RevisionReason, now: string): Workspace {
  return { ...ws, experiments: ws.experiments.map((e) => commitRevision(e, reason, now)) };
}

export function hasUnsavedChanges(ws: Workspace): boolean {
  return ws.changeSeq !== ws.savedSeq;
}

export function workspaceReducer(ws: Workspace, action: WorkspaceAction): Workspace {
  if (PROJECT_ACTIONS.has(action.type)) {
    const current = currentExperiment(ws);
    const next = projectReducer(current, action as ProjectAction);
    if (next === current) return ws;
    return {
      ...ws,
      experiments: ws.experiments.map((e) => (e.id === current.id ? next : e)),
      changeSeq: ws.changeSeq + 1,
    };
  }
  switch (action.type) {
    case "newProject":
      return {
        ...createWorkspace(action.projectId, action.name, action.experimentName, action.now),
        epoch: ws.epoch + 1,
      };
    case "loadDocument": {
      const experiments = action.document.experiments.map(fromExperiment);
      const first = experiments[0] ?? newExperiment("e1", "Experimento 1", action.now);
      return {
        projectId: action.document.projectId,
        name: action.document.name,
        createdAt: action.document.createdAt,
        experiments: experiments.length > 0 ? experiments : [first],
        currentId: first.id,
        counters: {
          experiment: maxSuffix(
            experiments.map((e) => e.id),
            "e",
          ),
        },
        changeSeq: 0,
        savedSeq: 0,
        fileName: action.fileName,
        lastSavedAt: null,
        epoch: ws.epoch + 1,
      };
    }
    case "renameProject":
      return { ...ws, name: action.name, changeSeq: ws.changeSeq + 1 };
    case "addExperiment": {
      const { id, counter } = freshId(
        "e",
        ws.counters.experiment,
        ws.experiments.map((e) => e.id),
      );
      const experiment = newExperiment(id, action.name, action.now);
      return {
        ...ws,
        experiments: [...ws.experiments, experiment],
        currentId: id,
        counters: { experiment: counter },
        changeSeq: ws.changeSeq + 1,
      };
    }
    case "selectExperiment":
      return ws.experiments.some((e) => e.id === action.id) ? { ...ws, currentId: action.id } : ws;
    case "commitAll":
      return commitWorkspace(ws, action.reason, action.now);
    case "markSaved":
      return { ...ws, savedSeq: action.seq, fileName: action.fileName, lastSavedAt: action.now };
    case "restoreWorkspace":
      return { ...action.workspace, epoch: ws.epoch + 1 };
    case "addConfirmation": {
      // Experimento novo, vinculado ao atual: mesmos fatores e respostas, ensaios propostos e as
      // previsões gravadas; a origem aponta para a última otimização do experimento atual.
      const source = currentExperiment(ws);
      const origin = source.analyses
        .filter((a) => a.methodId === "desirability_optimization")
        .at(-1);
      if (!origin) return ws;
      const { id, counter } = freshId(
        "e",
        ws.counters.experiment,
        ws.experiments.map((e) => e.id),
      );
      const base = newExperiment(id, action.name, action.now);
      const filled: ProjectState = {
        ...base,
        path: "analyze",
        factors: source.factors.map((f) => ({ ...f })),
        responses: source.responses.map((r) => ({ ...r })),
        rows: action.rows,
        counters: {
          ...base.counters,
          factor: source.counters.factor,
          response: source.counters.response,
          row: action.rows.length,
        },
        analysis: { ...base.analysis, responseId: source.responses[0]?.id ?? null },
        origin: { experimentId: source.id, analysisId: origin.id },
        confirmation: action.plan,
      };
      return {
        ...ws,
        experiments: [...ws.experiments, commitRevision(filled, "edit", action.now)],
        currentId: id,
        counters: { experiment: counter },
        changeSeq: ws.changeSeq + 1,
      };
    }
    default:
      return ws;
  }
}

function maxSuffix(ids: string[], prefix: string): number {
  return ids.reduce((max, id) => {
    const rest = id.startsWith(prefix) ? id.slice(prefix.length) : "";
    return /^\d+$/.test(rest) ? Math.max(max, Number(rest)) : max;
  }, 0);
}

/** Converte um experimento do documento em estado de trabalho. */
function fromExperiment(doc: ProjectDocument["experiments"][number]): ProjectState {
  const head = doc.revisions[doc.revisions.length - 1];
  const data = head?.data ?? { factors: [], responses: [], rows: [] };
  const last = [...doc.analyses].reverse().find((a) => a.result.type !== "optimization");
  const lastOptimization = [...doc.analyses]
    .reverse()
    .find((a) => a.result.type === "optimization");
  return {
    id: doc.id,
    name: doc.name,
    path: doc.entryPath,
    factors: data.factors.map((f) => ({ ...f })),
    responses: data.responses.map((r) => ({ ...r })),
    rows: data.rows.map((r) => ({ ...r, factors: [...r.factors], responses: [...r.responses] })),
    analysis: {
      responseId: doc.analysisSelection.responseId,
      groupBy: [...doc.analysisSelection.groupBy],
      factorId: doc.analysisSelection.factorId ?? null,
      alpha: doc.analysisSelection.alpha ?? DEFAULT_ALPHA,
      designTerms: doc.analysisSelection.terms ?? null,
      responseModels: Object.fromEntries(
        Object.entries(doc.analysisSelection.responseModels ?? {}).flatMap(([id, terms]) =>
          terms ? [[id, terms.map((t) => [...t])]] : [],
        ),
      ),
      includeCurvature: doc.analysisSelection.includeCurvature ?? true,
      surface: doc.analysisSelection.surface ?? false,
      procedure: doc.analysisSelection.procedure ?? null,
      factorial: doc.analysisSelection.factorial ?? null,
    },
    design: doc.design ?? null,
    crd: doc.crd ?? null,
    rcbd: doc.rcbd ?? null,
    mixed: doc.mixed ?? null,
    mixture: doc.mixture ?? null,
    mixtureModel: doc.mixtureModel ?? "quadratic",
    figureStyles: doc.figureStyles ?? {},
    origin: doc.origin ?? null,
    confirmation: doc.confirmation ?? null,
    optimization: {
      setup: doc.analysisSelection.optimization ?? lastOptimization?.options.optimization ?? null,
      result:
        lastOptimization?.result.type === "optimization"
          ? stripType(lastOptimization.result)
          : null,
      signature: lastOptimization?.signature ?? null,
    },
    // Reabrir NÃO recalcula: o resultado exibido é o guardado; a assinatura decide se está atual.
    result: storedResultOf(last),
    showUnitColumn: doc.showUnitColumn,
    counters: {
      factor: maxSuffix(
        data.factors.map((f) => f.id),
        "f",
      ),
      response: maxSuffix(
        data.responses.map((r) => r.id),
        "r",
      ),
      row: maxSuffix(
        data.rows.map((r) => r.id),
        "o",
      ),
      revision: maxSuffix(
        doc.revisions.map((r) => r.id),
        "v",
      ),
      analysis: maxSuffix(
        doc.analyses.map((a) => a.id),
        "a",
      ),
    },
    revisions: doc.revisions,
    analyses: doc.analyses,
    notes: doc.notes,
  };
}

function storedResultOf(last: AnalysisRecord | undefined): StoredResult | null {
  if (!last) return null;
  if (last.result.type === "descriptive")
    return { signature: last.signature, kind: "descriptive", result: stripType(last.result) };
  if (last.result.type === "twoLevelDesign")
    return { signature: last.signature, kind: "design", result: stripType(last.result) };
  if (last.result.type === "responseSurface")
    return { signature: last.signature, kind: "surface", result: stripType(last.result) };
  if (last.result.type === "optimization") return null; // a otimização tem estado próprio
  if (last.result.type === "multipleComparison")
    return { signature: last.signature, kind: "procedure", result: stripType(last.result) };
  if (last.result.type === "factorialAnova")
    return { signature: last.signature, kind: "factorial", result: stripType(last.result) };
  return { signature: last.signature, kind: "oneWay", result: stripType(last.result) };
}

function stripType<T extends { type: string }>(value: T): Omit<T, "type"> {
  const { type: _type, ...rest } = value;
  return rest;
}

/** Converte o espaço de trabalho (já com revisões registradas) em documento para gravar. */
export function toDocument(ws: Workspace, now: string, appVersion: string): ProjectDocument {
  return {
    schemaVersion: 1,
    projectId: ws.projectId,
    name: ws.name,
    createdAt: ws.createdAt,
    modifiedAt: now,
    appVersion,
    experiments: ws.experiments.map((e) => ({
      id: e.id,
      name: e.name,
      entryPath: e.path,
      showUnitColumn: e.showUnitColumn,
      analysisSelection: {
        responseId: e.analysis.responseId,
        groupBy: e.analysis.groupBy,
        ...(e.analysis.factorId !== null
          ? { factorId: e.analysis.factorId, alpha: e.analysis.alpha }
          : {}),
        ...(e.design !== null
          ? {
              alpha: e.analysis.alpha,
              includeCurvature: e.analysis.includeCurvature,
              ...(e.analysis.designTerms ? { terms: e.analysis.designTerms } : {}),
            }
          : {}),
        ...(e.optimization.setup ? { optimization: e.optimization.setup } : {}),
        ...(Object.keys(e.analysis.responseModels).length > 0
          ? { responseModels: e.analysis.responseModels }
          : {}),
        ...(e.analysis.procedure
          ? { procedure: e.analysis.procedure, alpha: e.analysis.alpha }
          : {}),
        ...(e.analysis.factorial
          ? { factorial: e.analysis.factorial, alpha: e.analysis.alpha }
          : {}),
        ...(e.analysis.surface
          ? {
              surface: true,
              alpha: e.analysis.alpha,
              ...(e.analysis.designTerms ? { terms: e.analysis.designTerms } : {}),
            }
          : {}),
      },
      ...(e.design !== null ? { design: e.design } : {}),
      ...(e.crd !== null ? { crd: e.crd } : {}),
      ...(e.rcbd !== null ? { rcbd: e.rcbd } : {}),
      ...(e.mixed !== null ? { mixed: e.mixed } : {}),
      ...(e.mixture !== null ? { mixture: e.mixture, mixtureModel: e.mixtureModel } : {}),
      ...(Object.keys(e.figureStyles).length > 0 ? { figureStyles: e.figureStyles } : {}),
      ...(e.origin ? { origin: e.origin } : {}),
      ...(e.confirmation ? { confirmation: e.confirmation } : {}),
      revisions: e.revisions,
      analyses: e.analyses,
      notes: e.notes,
    })),
  };
}
