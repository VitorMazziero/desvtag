// Converte os ensaios do planejamento gerado pelo motor em linhas da grade de dados.
// Aqui só há formatação de texto: níveis reais, codificação e ordem vêm do motor.
import type { GeneratedDesign } from "../../services/engine";
import { freshId, type ProjectState, type RowDraft } from "../../state/project";

/** Linhas na ordem de execução: fatores do planejamento com o valor real, demais colunas vazias. */
export function rowsFromDesign(
  design: GeneratedDesign,
  state: Pick<ProjectState, "factors" | "responses" | "counters">,
): { rows: RowDraft[]; counters: ProjectState["counters"] } {
  const columnOf = new Map(design.spec.factors.map((f, j) => [f.id, j]));
  let counter = state.counters.row;
  const rows: RowDraft[] = design.runs.map((run) => {
    const fresh = freshId("o", counter, []);
    counter = fresh.counter;
    return {
      id: fresh.id,
      unitId: "",
      factors: state.factors.map((f) => {
        const j = columnOf.get(f.id);
        const value = j === undefined ? undefined : run.real[j];
        return value === undefined ? "" : String(value);
      }),
      responses: state.responses.map(() => ""),
    };
  });
  return { rows, counters: { ...state.counters, row: counter } };
}
