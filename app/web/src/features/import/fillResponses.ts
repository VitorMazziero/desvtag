// Planilha de coleta (ET13): cruza as linhas de um arquivo (a matriz de ensaios exportada, com as
// respostas preenchidas) com as linhas do experimento e devolve só as células de resposta a gravar.
// Aqui não há cálculo científico: é correspondência de texto e conferência de níveis.
import type { RowDraft } from "../../state/project";
import { parseNumberCell } from "../data/editing";

/** Fator ou resposta do experimento, como a correspondência precisa deles. */
export interface SheetFactor {
  name: string;
  kind: "numeric" | "categorical";
}
export interface SheetResponse {
  name: string;
  unit: string;
}

/** Uma linha do arquivo (ou um ensaio da matriz): unidade e nível de cada fator, na ordem do experimento. */
export interface SheetLine {
  unit: string;
  /** `undefined` = a linha não informa esse fator (não entra na conferência). */
  levels: (string | undefined)[];
}

/** Rótulo de uma resposta no cabeçalho da planilha: `Nome (unidade)` ou só o nome. */
export function responseLabel(r: SheetResponse): string {
  return r.unit.trim() === "" ? r.name : `${r.name} (${r.unit.trim()})`;
}

const norm = (s: string) => s.trim().normalize("NFC").toLowerCase();

/** Tolerância relativa na comparação de níveis numéricos: planilhas arredondam. */
export const LEVEL_TOLERANCE = 1e-9;

export function levelsEqual(a: string, b: string, kind: SheetFactor["kind"]): boolean {
  if (kind === "numeric") {
    const x = parseNumberCell(a);
    const y = parseNumberCell(b);
    if (x.ok && y.ok && x.value !== null && y.value !== null) {
      return (
        Math.abs(x.value - y.value) <=
        LEVEL_TOLERANCE * Math.max(1, Math.abs(x.value), Math.abs(y.value))
      );
    }
  }
  return a.trim() === b.trim();
}

/**
 * Para cada linha do arquivo, o índice da linha do experimento correspondente (ou `null`).
 * Se todas as linhas trazem a unidade experimental, vale a unidade (`T1-R1`, `B1-T2`…). Senão, vale
 * a combinação de níveis; ensaios com os mesmos níveis (réplicas) são atribuídos na ordem em que
 * aparecem, o que os torna intercambiáveis para a análise.
 */
export function assignRows(
  lines: SheetLine[],
  rows: RowDraft[],
  factors: SheetFactor[],
): (number | null)[] {
  const byUnit = lines.length > 0 && lines.every((l) => l.unit.trim() !== "");
  const used = new Set<number>();
  if (byUnit) {
    const index = new Map<string, number>();
    rows.forEach((r, i) => {
      const key = r.unitId.trim();
      if (key !== "" && !index.has(key)) index.set(key, i);
    });
    return lines.map((l) => {
      const i = index.get(l.unit.trim());
      if (i === undefined || used.has(i)) return null;
      used.add(i);
      return i;
    });
  }
  return lines.map((line) => {
    const i = rows.findIndex(
      (row, k) =>
        !used.has(k) &&
        line.levels.every((level, f) => {
          if (level === undefined) return true;
          const factor = factors[f];
          return factor !== undefined && levelsEqual(level, row.factors[f] ?? "", factor.kind);
        }),
    );
    if (i < 0) return null;
    used.add(i);
    return i;
  });
}

/** Colunas do arquivo reconhecidas como fator, resposta e unidade. */
export interface SheetPlan {
  /** Coluna do arquivo de cada fator do experimento (`-1` se o arquivo não a traz). */
  factorColumns: number[];
  /** Coluna do arquivo de cada resposta do experimento (`-1` se não houver). */
  responseColumns: number[];
  unitColumn: number;
}

const UNIT_HEADERS = ["unit_id", "unidade", "unit"];

/**
 * Reconhece o cabeçalho de uma planilha de coleta: precisa trazer **todos** os fatores do
 * experimento (para cruzar os ensaios) e ao menos uma resposta. Caso contrário, `null`: o arquivo é
 * tratado como dados novos.
 */
export function planSheet(
  header: string[],
  factors: SheetFactor[],
  responses: SheetResponse[],
): SheetPlan | null {
  if (factors.length === 0 || responses.length === 0) return null;
  const names = header.map(norm);
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = names.indexOf(norm(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const factorColumns = factors.map((f) => find(f.name));
  if (factorColumns.some((c) => c < 0) && !UNIT_HEADERS.some((h) => names.includes(h))) return null;
  const responseColumns = responses.map((r) => find(responseLabel(r), r.name));
  if (responseColumns.every((c) => c < 0)) return null;
  const unitColumn = names.findIndex((n) => UNIT_HEADERS.includes(n));
  return { factorColumns, responseColumns, unitColumn };
}

export interface FillCell {
  row: number;
  response: number;
  text: string;
}

export interface FillResult {
  /** Células de resposta a gravar (só as que o arquivo traz preenchidas e legíveis). */
  cells: FillCell[];
  /** Células a gravar que já tinham outro valor. */
  replacing: number;
  /** Células de resposta em branco no arquivo (ficam como estão). */
  empty: number;
  /** Linhas do arquivo (1 = primeira linha de dados) sem ensaio correspondente: nada é gravado. */
  unmatchedLines: number[];
  /** Ensaios do experimento sem linha no arquivo. */
  rowsWithoutLine: number;
  /** Células de resposta que não são número (linha do arquivo, resposta, texto). */
  invalid: { line: number; response: number; text: string }[];
}

/** Aplica a correspondência e valida os números. Nenhum estado é alterado. */
export function fillResponses(
  body: string[][],
  plan: SheetPlan,
  rows: RowDraft[],
  factors: SheetFactor[],
): FillResult {
  const cell = (r: string[], c: number) => (c >= 0 ? (r[c] ?? "").trim() : "");
  const kept = body
    .map((r, i) => ({ r, line: i + 1 }))
    .filter(({ r }) => r.some((c) => c.trim() !== ""));
  const lines: SheetLine[] = kept.map(({ r }) => ({
    unit: cell(r, plan.unitColumn),
    levels: plan.factorColumns.map((c) => (c >= 0 ? cell(r, c) : undefined)),
  }));
  const assigned = assignRows(lines, rows, factors);

  const result: FillResult = {
    cells: [],
    replacing: 0,
    empty: 0,
    unmatchedLines: [],
    rowsWithoutLine: 0,
    invalid: [],
  };
  kept.forEach(({ r, line }, k) => {
    const row = assigned[k];
    if (row === null || row === undefined) {
      result.unmatchedLines.push(line);
      return;
    }
    plan.responseColumns.forEach((c, response) => {
      if (c < 0) return;
      const text = cell(r, c);
      if (text === "") {
        result.empty += 1;
        return;
      }
      if (!parseNumberCell(text).ok) {
        result.invalid.push({ line, response, text });
        return;
      }
      if ((rows[row]?.responses[response] ?? "").trim() !== "") result.replacing += 1;
      result.cells.push({ row, response, text });
    });
  });
  result.rowsWithoutLine = rows.length - assigned.filter((a) => a !== null).length;
  return result;
}

/**
 * Valores já digitados de cada ensaio de uma matriz (para reexportar a planilha de coleta com o que
 * já foi preenchido): texto de cada resposta do experimento, na ordem das linhas da matriz.
 */
export function existingResponses(
  lines: SheetLine[],
  rows: RowDraft[],
  factors: SheetFactor[],
  responseCount: number,
): string[][] {
  const assigned = assignRows(lines, rows, factors);
  return assigned.map((row) =>
    Array.from({ length: responseCount }, (_, j) =>
      row === null ? "" : (rows[row]?.responses[j] ?? ""),
    ),
  );
}
