// Pure revision and identifier operations shared by legacy and saved-family reducers.
import type { ExperimentData, Revision, RevisionReason } from "../services/engine";
import type { ProjectState } from "./project";

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
      ...(r.timeText !== undefined ? { timeText: r.timeText } : {}),
    })),
  };
}

export function sameData(a: ExperimentData, b: ExperimentData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
