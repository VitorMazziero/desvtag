// Conversão e edição de células (U04). Converte o TEXTO digitado em valor;
// a validade científica dos dados é verificada pelo motor (C02).
import { blankRow, type ProjectState, type RowDraft, setCellText } from "../../state/project";

export type CellParse =
  | { ok: true; value: number | null }
  | { ok: false; code: "notANumber" | "notFinite" };

const NUMBER = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$/;

/**
 * Lê um número digitado. Aceita um único separador decimal, ponto ou vírgula.
 * Vazio significa dado ausente. Separadores de milhar são rejeitados (ambíguos).
 * Infinito e NaN nunca são aceitos: `JSON.stringify` os transformaria em `null`
 * (ausente) sem aviso.
 */
export function parseNumberCell(text: string): CellParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (!NUMBER.test(trimmed)) return { ok: false, code: "notANumber" };
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value)) return { ok: false, code: "notFinite" };
  return { ok: true, value };
}

/** Separa o texto colado (do Excel: colunas por tabulação, linhas por quebra de linha). */
export function parseClipboard(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

/**
 * Aplica uma matriz colada a partir de (`startRow`, `startColumn`), acrescentando linhas
 * quando necessário. Colunas além da última são ignoradas e contadas em `ignoredColumns`.
 */
export function applyPaste(
  state: Pick<ProjectState, "rows" | "factors" | "responses" | "counters"> &
    Partial<Pick<ProjectState, "showTimeColumn">>,
  startRow: number,
  startColumn: number,
  matrix: string[][],
): { rows: RowDraft[]; counters: ProjectState["counters"]; ignoredColumns: number } {
  const factorCount = state.factors.length;
  const lastColumn = factorCount + state.responses.length + (state.showTimeColumn ? 1 : 0);
  const rows = state.rows.slice();
  let counters = state.counters;
  let ignoredColumns = 0;
  matrix.forEach((cells, r) => {
    const target = startRow + r;
    while (rows.length <= target) {
      const [row, next] = blankRow({
        factors: state.factors,
        responses: state.responses,
        counters,
      });
      rows.push(row);
      counters = next;
    }
    cells.forEach((value, c) => {
      const column = startColumn + c;
      if (column > lastColumn) {
        ignoredColumns = Math.max(ignoredColumns, column - lastColumn);
        return;
      }
      const current = rows[target];
      if (current) rows[target] = setCellText(current, column, factorCount, value);
    });
  });
  return { rows, counters, ignoredColumns };
}
