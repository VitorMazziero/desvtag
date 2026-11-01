// Papéis das colunas da grade (U04): unidade experimental, fator ou resposta.
import type { ProjectState } from "../../state/project";

export type ColumnRole = "unit" | "factor" | "response";

export interface GridColumn {
  /** Índice da coluna conforme `setCellText`: 0 unidade, depois fatores, depois respostas. */
  index: number;
  role: ColumnRole;
  /** Identificador do fator/resposta (vazio para a unidade). */
  id: string;
  name: string;
  unit: string;
}

export function gridColumns(
  state: Pick<ProjectState, "factors" | "responses" | "showUnitColumn">,
): GridColumn[] {
  const columns: GridColumn[] = [];
  if (state.showUnitColumn) columns.push({ index: 0, role: "unit", id: "", name: "", unit: "" });
  for (const [i, f] of state.factors.entries()) {
    columns.push({ index: i + 1, role: "factor", id: f.id, name: f.name, unit: f.unit });
  }
  for (const [i, r] of state.responses.entries()) {
    columns.push({
      index: state.factors.length + 1 + i,
      role: "response",
      id: r.id,
      name: r.name,
      unit: r.unit,
    });
  }
  return columns;
}
