// Espaço de trabalho: o projeto aberto (vários experimentos) e o controle de alterações.
// O reducer do experimento atual vem de `project.ts`; aqui ficam as ações do projeto.
import type { AnalysisRecord, ProjectDocument, RevisionReason } from "../services/engine";
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
  | { type: "restoreWorkspace"; workspace: Workspace };

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
  "addRow",
  "removeRow",
  "setUnitColumn",
  "setAnalysis",
  "setNotes",
  "rename",
  "storeResult",
  "applyImport",
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
  const last = doc.analyses[doc.analyses.length - 1];
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
      },
      revisions: e.revisions,
      analyses: e.analyses,
      notes: e.notes,
    })),
  };
}
