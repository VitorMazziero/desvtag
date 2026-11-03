// Mapeamento das colunas de um arquivo para fatores, respostas e identificadores (U05).
// Produz `ExperimentData` com o TEXTO das células; nenhum número é interpretado aqui.
import type { ExperimentData } from "../../services/engine";
import { parseNumberCell } from "../data/editing";

export type ColumnRole = "ignore" | "observation" | "unit" | "factor" | "response";
export type FactorKindChoice = "numeric" | "categorical";

export interface ColumnMapping {
  role: ColumnRole;
  /** Só para `factor`. */
  kind: FactorKindChoice;
  name: string;
}

export interface ImportIssue {
  code: "import.invalid_observation_id" | "import.duplicate_observation_id" | "import.no_columns";
  /** Linhas do arquivo (1 = primeira linha de dados) envolvidas, no máximo 5. */
  rows: number[];
}

export interface ImportResult {
  data: ExperimentData;
  /** Problemas que impedem importar. */
  issues: ImportIssue[];
  /** Linhas de dados totalmente vazias nas colunas importadas (ignoradas). */
  skippedEmptyRows: number;
}

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;
const HEADER_NUMBER = /^[+-]?\d/;

/** A primeira linha parece um cabeçalho? (nenhum campo não vazio começa como número) */
export function looksLikeHeader(rows: string[][]): boolean {
  const first = rows[0];
  if (!first || first.every((c) => c.trim() === "")) return false;
  return first.every((cell) => cell.trim() === "" || !HEADER_NUMBER.test(cell.trim()));
}

/** Todas as células não vazias da coluna são números legíveis? */
function columnIsNumeric(rows: string[][], column: number): boolean {
  const cells = rows.map((r) => (r[column] ?? "").trim()).filter((c) => c !== "");
  return cells.length > 0 && cells.every((c) => parseNumberCell(c).ok);
}

/** Fatores e respostas já cadastrados no experimento: os nomes iguais têm prioridade na sugestão. */
export interface KnownVariables {
  factors: Array<{ name: string; kind: FactorKindChoice }>;
  responses: Array<{ name: string }>;
}

/** Nome comparável: sem acentos, caixa ou unidade entre parênteses/colchetes no fim. */
function comparableName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*[([][^)\]]*[)\]]\s*$/, "")
    .trim()
    .toLowerCase();
}

/**
 * Sugestão inicial. Colunas com o nome de uma resposta ou de um fator já cadastrados (UX23)
 * recebem esse papel; só depois, entre as demais, a última coluna numérica vira resposta quando
 * o experimento ainda não tem resposta correspondente. É só uma sugestão: o usuário confirma.
 */
export function guessMapping(
  rows: string[][],
  hasHeader: boolean,
  known?: KnownVariables,
): ColumnMapping[] {
  const width = rows.reduce((max, r) => Math.max(max, r.length), 0);
  const body = hasHeader ? rows.slice(1) : rows;
  const names = Array.from({ length: width }, (_, i) => {
    const raw = hasHeader ? (rows[0]?.[i] ?? "").trim() : "";
    return raw !== "" ? raw : `Coluna ${i + 1}`;
  });
  const numeric = names.map((_, i) => columnIsNumeric(body, i));
  const knownResponse = new Set((known?.responses ?? []).map((r) => comparableName(r.name)));
  const knownFactor = new Map((known?.factors ?? []).map((f) => [comparableName(f.name), f.kind]));
  const matchesResponse = names.map((n) => hasHeader && knownResponse.has(comparableName(n)));
  const matchesFactor = names.map((n) => hasHeader && knownFactor.has(comparableName(n)));
  const hasKnownResponse = matchesResponse.some(Boolean);
  const lastNumeric = hasKnownResponse
    ? -1
    : numeric.reduce((last, isNumeric, i) => (isNumeric && !matchesFactor[i] ? i : last), -1);
  return names.map((name, i): ColumnMapping => {
    if (matchesResponse[i]) return { role: "response", kind: "numeric", name };
    if (matchesFactor[i])
      return {
        role: "factor",
        kind: knownFactor.get(comparableName(name)) ?? (numeric[i] ? "numeric" : "categorical"),
        name,
      };
    if (width >= 2 && i === lastNumeric) return { role: "response", kind: "numeric", name };
    return { role: "factor", kind: numeric[i] ? "numeric" : "categorical", name };
  });
}

/** Constrói os dados do experimento a partir da grade e do mapeamento. */
export function buildExperimentData(
  rows: string[][],
  hasHeader: boolean,
  mapping: ColumnMapping[],
): ImportResult {
  const body = hasHeader ? rows.slice(1) : rows;
  const factorColumns = mapping.flatMap((m, i) => (m.role === "factor" ? [i] : []));
  const responseColumns = mapping.flatMap((m, i) => (m.role === "response" ? [i] : []));
  const observationColumn = mapping.findIndex((m) => m.role === "observation");
  const unitColumn = mapping.findIndex((m) => m.role === "unit");
  const issues: ImportIssue[] = [];
  if (factorColumns.length + responseColumns.length === 0) {
    return {
      data: { factors: [], responses: [], rows: [] },
      issues: [{ code: "import.no_columns", rows: [] }],
      skippedEmptyRows: 0,
    };
  }

  const cell = (row: string[], column: number) => (row[column] ?? "").trim();
  const importedColumns = [
    ...factorColumns,
    ...responseColumns,
    ...(unitColumn >= 0 ? [unitColumn] : []),
  ];
  const kept: Array<{ row: string[]; number: number }> = [];
  let skipped = 0;
  body.forEach((row, i) => {
    if (importedColumns.every((c) => cell(row, c) === "")) skipped += 1;
    else kept.push({ row, number: i + 1 });
  });

  const used = new Set<string>();
  const invalid: number[] = [];
  const duplicate: number[] = [];
  const records = kept.map(({ row, number }, index) => {
    let id = `o${index + 1}`;
    if (observationColumn >= 0) {
      const raw = cell(row, observationColumn);
      if (!ID.test(raw)) invalid.push(number);
      else if (used.has(raw)) duplicate.push(number);
      id = ID.test(raw) ? raw : id;
    }
    used.add(id);
    return {
      id,
      unitId: unitColumn >= 0 ? cell(row, unitColumn) : "",
      factors: factorColumns.map((c) => cell(row, c)),
      responses: responseColumns.map((c) => cell(row, c)),
    };
  });
  if (invalid.length > 0)
    issues.push({ code: "import.invalid_observation_id", rows: invalid.slice(0, 5) });
  if (duplicate.length > 0)
    issues.push({ code: "import.duplicate_observation_id", rows: duplicate.slice(0, 5) });

  return {
    data: {
      factors: factorColumns.map((c, i) => ({
        id: `f${i + 1}`,
        name: (mapping[c]?.name ?? "").trim(),
        kind: mapping[c]?.kind ?? "categorical",
        unit: "",
        levelsText: "",
      })),
      responses: responseColumns.map((c, i) => ({
        id: `r${i + 1}`,
        name: (mapping[c]?.name ?? "").trim(),
        unit: "",
      })),
      rows: records,
    },
    issues,
    skippedEmptyRows: skipped,
  };
}
