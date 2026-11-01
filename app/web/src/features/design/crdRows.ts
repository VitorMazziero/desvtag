// Converte os ensaios do DIC gerado pelo motor em linhas da grade de dados. Só formatação: níveis,
// ordem de execução e repetições vêm do motor. Cada ensaio é uma unidade experimental com identidade
// própria (`T<nível>-R<unidade>`), estável mesmo quando a semente muda.
import type { GeneratedCrd } from "../../services/engine";
import { freshId, type ProjectState, type RowDraft } from "../../state/project";

export function unitIdOf(run: { levelIndex: number; replicate: number }): string {
  return `T${run.levelIndex + 1}-R${run.replicate}`;
}

export function rowsFromCrd(
  crd: GeneratedCrd,
  state: Pick<ProjectState, "factors" | "responses" | "counters">,
): { rows: RowDraft[]; counters: ProjectState["counters"] } {
  let counter = state.counters.row;
  const rows: RowDraft[] = crd.runs.map((run) => {
    const fresh = freshId("o", counter, []);
    counter = fresh.counter;
    return {
      id: fresh.id,
      unitId: unitIdOf(run),
      factors: state.factors.map((f) => (f.id === crd.spec.factorId ? run.level : "")),
      responses: state.responses.map(() => ""),
    };
  });
  return { rows, counters: { ...state.counters, row: counter } };
}
