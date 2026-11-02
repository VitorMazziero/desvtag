// Planilha de coleta (ET13): colunas de resposta que acompanham a matriz de ensaios exportada. Vazias
// quando nada foi digitado; com os valores já digitados quando os ensaios existem nos dados.

import type { Cell } from "../../services/export";
import type { ProjectState } from "../../state/project";
import { existingResponses, responseLabel, type SheetLine } from "../import/fillResponses";

export interface CollectionColumns {
  header: string[];
  /** Uma linha por ensaio da matriz, uma célula por resposta. */
  cells: Cell[][];
}

export function collectionColumns(
  state: Pick<ProjectState, "factors" | "responses" | "rows">,
  lines: SheetLine[],
): CollectionColumns {
  const factors = state.factors.map((f) => ({ name: f.name, kind: f.kind }));
  const values = existingResponses(lines, state.rows, factors, state.responses.length);
  return {
    header: state.responses.map(responseLabel),
    cells: values.map((row) => row.map((text) => (text === "" ? null : text))),
  };
}
