// CSV de tabelas (U16): UTF-8 com BOM (o Excel reconhece os acentos), números com todos os
// algarismos que os reproduzem. Formato técnico: vírgula e ponto decimal. Formato "Excel em
// português": ponto e vírgula e vírgula decimal (abre direto no Excel com a configuração regional
// brasileira). As linhas iniciais com `#` registram método, configuração, revisão e versões; leitores
// como pandas as ignoram com `comment="#"`.
//
// Proteção contra fórmulas acidentais: texto que começa por `=`, `+`, `-`, `@`, tabulação ou retorno
// de carro recebe uma aspa simples no início (OWASP, "CSV injection"); números não são afetados.

export type Cell = string | number | null;

export interface CsvDialect {
  delimiter: "," | ";";
  decimal: "." | ",";
}

export const TECHNICAL: CsvDialect = { delimiter: ",", decimal: "." };
export const EXCEL_PT: CsvDialect = { delimiter: ";", decimal: "," };

/** Texto que um programa de planilhas poderia interpretar como fórmula. */
export function looksLikeFormula(text: string): boolean {
  return /^[=+\-@\t\r]/.test(text);
}

function quote(cell: Cell, dialect: CsvDialect): string {
  if (cell === null) return "";
  let text: string;
  if (typeof cell === "number") {
    text = String(cell);
    if (dialect.decimal === ",") text = text.replace(".", ",");
  } else {
    text = looksLikeFormula(cell) ? `'${cell}` : cell;
  }
  const needsQuotes =
    text.includes('"') ||
    text.includes(dialect.delimiter) ||
    /[\r\n]/.test(text) ||
    text !== text.trim();
  return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Monta o texto do CSV: metadados (`# chave: valor`), linha em branco e a tabela. */
export function toCsv(
  header: string[],
  rows: Cell[][],
  metadata: Record<string, string>,
  dialect: CsvDialect = TECHNICAL,
): string {
  const meta = Object.entries(metadata).map(
    ([key, value]) => `# ${key}: ${value.replace(/[\r\n]+/g, " ")}`,
  );
  const table = [header, ...rows].map((row) =>
    row.map((c) => quote(c, dialect)).join(dialect.delimiter),
  );
  return `﻿${[...meta, "", ...table].join("\r\n")}\r\n`;
}

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
